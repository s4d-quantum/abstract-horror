<?php
/**
 * Book DPD with Manually Validated Address
 * 
 * Handles DPD booking after manual address validation/selection
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load dependencies
require_once 'db_config.php';
require_once 'orders/imei/includes/AddressValidator.php';
require_once 'sales/imei_orders/includes/dpd_printer_helper.php';

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$bm_order_id = $_GET['order_id'] ?? '';
$error_message = null;
$success_message = null;

// Check if we have validated address data
if (empty($_SESSION['manual_validated_address']) || 
    empty($_SESSION['manual_validated_order_id']) || 
    $_SESSION['manual_validated_order_id'] !== $bm_order_id) {
    
    header('Location: address_manual_review.php?order_id=' . urlencode($bm_order_id) . '&error=no_validated_address');
    exit;
}

$validation_result = $_SESSION['manual_validated_address'];
$validated_address = $validation_result['validated_address'];

// Handle booking request
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'book_dpd') {
    try {
        // Get customer data
        $stmt = mysqli_prepare($conn, "SELECT * FROM tbl_bm2 WHERE bm_order_id = ? LIMIT 1");
        mysqli_stmt_bind_param($stmt, "s", $bm_order_id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        if (!$result || mysqli_num_rows($result) === 0) {
            throw new Exception("Order not found: $bm_order_id");
        }
        
        $order_data = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);
        
        // Format address for DPD using AddressValidator
        $api_key = $_ENV['IDEAL_POSTCODES_API_KEY'] ?? '';
        $validator = new AddressValidator($api_key);
        
        $dpd_format_result = $validator->formatForDPD($validated_address, [
            'first_name' => $order_data['first_name'],
            'last_name' => $order_data['last_name'],
            'phone' => $order_data['phone'],
            'email' => $order_data['email']
        ]);
        
        if (!$dpd_format_result['success']) {
            throw new Exception("Failed to format address for DPD: " . $dpd_format_result['message']);
        }
        
        $dpd_address = $dpd_format_result['dpd_address'];
        $dpd_address['price'] = $order_data['price'];
        
        // Execute DPD booking
        $bookdpd_path = __DIR__ . '/orders/imei/includes/bookdpd.php';
        
        $dpd_printer_endpoint = resolveDpdPrinter();

        $dpd_command = "php " . escapeshellarg($bookdpd_path) . 
            " --fn " . escapeshellarg($dpd_address['first_name']) .
            " --ln " . escapeshellarg($dpd_address['last_name']) .
            " --ph " . escapeshellarg($dpd_address['phone']) .
            " --st " . escapeshellarg($dpd_address['street']) .
            " --city " . escapeshellarg($dpd_address['city']) .
            " --pc " . escapeshellarg($dpd_address['postal_code']) .
            " --em " . escapeshellarg($dpd_address['email']) .
            " --price " . escapeshellarg($dpd_address['price']) .
            " --ref " . escapeshellarg($bm_order_id) .
            " --printer " . escapeshellarg($dpd_printer_endpoint);
        
        if (!empty($dpd_address['street_2'])) {
            $dpd_command .= " --locality " . escapeshellarg($dpd_address['street_2']);
        }
        
        $dpd_output = [];
        $dpd_exit_code = 0;
        
        exec($dpd_command . ' 2>&1', $dpd_output, $dpd_exit_code);
        
        $dpd_result_raw = implode("\n", $dpd_output);
        
        if ($dpd_exit_code !== 0) {
            throw new Exception("DPD booking failed: $dpd_result_raw");
        }
        
        // Parse DPD result
        $dpd_result = null;
        $lines = explode("\n", $dpd_result_raw);
        
        foreach (array_reverse($lines) as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            $json_attempt = json_decode($line, true);
            if ($json_attempt !== null && isset($json_attempt['success'])) {
                $dpd_result = $json_attempt;
                break;
            }
        }
        
        if (!$dpd_result || !$dpd_result['success']) {
            throw new Exception("Failed to parse DPD booking response");
        }
        
        // Extract shipment details
        $consignment_no = $dpd_result['consignment_no'] ?? null;
        $parcel_no = $dpd_result['parcel_no'] ?? null;
        $shipment_id = $dpd_result['shipment_id'] ?? null;
        
        if (!$consignment_no) {
            throw new Exception("Missing consignment number in DPD response");
        }
        
        // Update database with shipment details and validation info
        $update_stmt = mysqli_prepare($conn, "
            UPDATE tbl_bm2 SET 
                consignment_no = ?, 
                parcel_no = ?, 
                shipment_id = ?,
                v_status = 5,
                v_match_level = ?,
                v_confidence_score = ?,
                v_validated_at = NOW()
            WHERE bm_order_id = ?
        ");
        
        $manual_match_level = $validation_result['manual_selection'] ? 'manual_selected' : 'manual_edited';
        $confidence_score = $validation_result['confidence_score'];
        
        mysqli_stmt_bind_param($update_stmt, "ssssds", 
            $consignment_no, $parcel_no, $shipment_id,
            $manual_match_level, $confidence_score, $bm_order_id
        );
        
        if (mysqli_stmt_execute($update_stmt)) {
            $success_message = "✅ DPD shipment booked successfully! Consignment: $consignment_no";
            
            // Clear session data
            unset($_SESSION['manual_validated_address']);
            unset($_SESSION['manual_validated_order_id']);
            
        } else {
            $success_message = "⚠️ DPD shipment booked (Consignment: $consignment_no) but database update failed.";
        }
        
        mysqli_stmt_close($update_stmt);
        
    } catch (Exception $e) {
        $error_message = "Booking failed: " . $e->getMessage();
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book DPD Shipment - Order <?php echo htmlspecialchars($bm_order_id); ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        h1 {
            color: #007cba;
            border-bottom: 3px solid #007cba;
            padding-bottom: 10px;
        }
        
        .success {
            background-color: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            border: 1px solid #c3e6cb;
        }
        
        .error {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            border: 1px solid #f5c6cb;
        }
        
        .address-display {
            background-color: #e3f2fd;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
            border: 1px solid #2196f3;
        }
        
        .validation-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            border: 1px solid #dee2e6;
        }
        
        button {
            background-color: #007cba;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-right: 10px;
        }
        
        button:hover {
            background-color: #005a87;
        }
        
        button.danger {
            background-color: #d32f2f;
        }
        
        button.danger:hover {
            background-color: #b71c1c;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📦 Book DPD Shipment</h1>
        
        <?php if ($success_message): ?>
            <div class="success">
                <?php echo $success_message; ?>
                <br><br>
                <a href="orders/imei/order_details.php?order_id=<?php echo urlencode($bm_order_id); ?>">← Back to Order Details</a>
            </div>
        <?php endif; ?>
        
        <?php if ($error_message): ?>
            <div class="error">
                <strong>❌ Error:</strong> <?php echo htmlspecialchars($error_message); ?>
            </div>
        <?php endif; ?>
        
        <?php if (!$success_message): ?>
            <p><strong>Order ID:</strong> <?php echo htmlspecialchars($bm_order_id); ?></p>
            
            <h2>✅ Validated Address</h2>
            <div class="address-display">
                <strong>Address to be used for DPD booking:</strong><br><br>
                <?php echo htmlspecialchars($validated_address['line_1'] ?? ''); ?><br>
                <?php if (!empty($validated_address['line_2'])): ?>
                    <?php echo htmlspecialchars($validated_address['line_2']); ?><br>
                <?php endif; ?>
                <?php if (!empty($validated_address['line_3'])): ?>
                    <?php echo htmlspecialchars($validated_address['line_3']); ?><br>
                <?php endif; ?>
                <?php echo htmlspecialchars($validated_address['post_town'] ?? $validated_address['town'] ?? ''); ?><br>
                <?php echo htmlspecialchars($validated_address['postcode'] ?? ''); ?><br>
                <?php echo htmlspecialchars($validated_address['country'] ?? 'GB'); ?>
            </div>
            
            <div class="validation-info">
                <strong>Validation Details:</strong><br>
                Match Level: <?php echo htmlspecialchars($validation_result['match_level'] ?? 'Unknown'); ?><br>
                Confidence Score: <?php echo htmlspecialchars($validation_result['confidence_score'] ?? 'N/A'); ?><br>
                <?php if (isset($validation_result['manual_selection']) && $validation_result['manual_selection']): ?>
                    <em>Address was manually selected from suggestions</em>
                <?php else: ?>
                    <em>Address was manually edited and validated</em>
                <?php endif; ?>
            </div>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="book_dpd">
                <button type="submit">📦 Book DPD Shipment</button>
                <button type="button" class="danger" onclick="window.history.back();">❌ Go Back</button>
            </form>
        <?php endif; ?>
    </div>
</body>
</html>
