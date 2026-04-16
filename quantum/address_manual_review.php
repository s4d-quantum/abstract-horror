<?php
/**
 * Address Manual Review Interface
 * 
 * Provides manual review interface for addresses that failed validation
 * Allows users to select from suggestions or manually edit addresses
 */

// Enable error reporting for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Load environment and dependencies
require_once 'db_config.php';
require_once 'orders/imei/includes/AddressValidator.php';
require_once 'orders/imei/includes/validate_address_service.php';

// Start session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Initialize variables
$bm_order_id = $_GET['order_id'] ?? $_POST['bm_order_id'] ?? '';
$error_message = null;
$success_message = null;
$address_data = null;
$suggestions = [];
$validation_error = null;

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $action = $_POST['action'] ?? '';
        
        if ($action === 'validate_manual_address') {
            // Get manually edited address
            $manual_address = [
                'street' => trim($_POST['street'] ?? ''),
                'street_2' => trim($_POST['street_2'] ?? ''),
                'city' => trim($_POST['city'] ?? ''),
                'postal_code' => trim($_POST['postal_code'] ?? ''),
                'country' => 'GB'
            ];
            
            // Validate the manual address
            $api_key = $_ENV['IDEAL_POSTCODES_API_KEY'] ?? '';
            $validator = new AddressValidator($api_key, ['debug' => true]);
            
            $validation_result = $validator->validateAddress($manual_address);
            
            if ($validation_result['success']) {
                // Store the validated address and redirect to booking
                $_SESSION['manual_validated_address'] = $validation_result;
                $_SESSION['manual_validated_order_id'] = $bm_order_id;
                
                $success_message = "Address validated successfully! Redirecting to booking...";
                echo "<script>setTimeout(function(){ window.location.href = 'book_dpd_with_validated_address.php?order_id=" . urlencode($bm_order_id) . "'; }, 2000);</script>";
            } else {
                $error_message = "Manual validation failed: " . $validation_result['message'];
            }
            
        } elseif ($action === 'select_suggestion') {
            // User selected a suggestion
            $selected_udprn = $_POST['selected_udprn'] ?? '';
            
            if (!empty($selected_udprn)) {
                // Get detailed address using UDPRN
                $api_key = $_ENV['IDEAL_POSTCODES_API_KEY'] ?? '';
                $validator = new AddressValidator($api_key, ['debug' => true]);
                
                $udprn_url = $validator->getApiBaseUrl() . '/udprn/' . $selected_udprn;
                $request_data = ['api_key' => $validator->getApiKey()];
                
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $udprn_url . '?' . http_build_query($request_data),
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 10,
                    CURLOPT_SSL_VERIFYPEER => true
                ]);
                
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($http_code === 200) {
                    $data = json_decode($response, true);
                    if (!empty($data['result'])) {
                        // Create validation result from selected address
                        $selected_address = $data['result'];
                        $validation_result = [
                            'success' => true,
                            'validated_address' => $selected_address,
                            'match_level' => 'manual_selected',
                            'confidence_score' => 1.0,
                            'corrections_made' => ['manual_selection'],
                            'manual_selection' => true
                        ];
                        
                        $_SESSION['manual_validated_address'] = $validation_result;
                        $_SESSION['manual_validated_order_id'] = $bm_order_id;
                        
                        $success_message = "Address selected successfully! Redirecting to booking...";
                        echo "<script>setTimeout(function(){ window.location.href = 'book_dpd_with_validated_address.php?order_id=" . urlencode($bm_order_id) . "'; }, 2000);</script>";
                    }
                }
            }
        }
        
    } catch (Exception $e) {
        $error_message = "Error: " . $e->getMessage();
    }
}

// Load order data and validation error info
if (!empty($bm_order_id)) {
    try {
        // Get order data
        $stmt = mysqli_prepare($conn, "SELECT * FROM tbl_bm2 WHERE bm_order_id = ? LIMIT 1");
        mysqli_stmt_bind_param($stmt, "s", $bm_order_id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        if ($result && mysqli_num_rows($result) > 0) {
            $address_data = mysqli_fetch_assoc($result);
            
            // Try to get validation error details from session or re-run validation
            if (isset($_SESSION['validation_error_' . $bm_order_id])) {
                $validation_error = $_SESSION['validation_error_' . $bm_order_id];
                $suggestions = $validation_error['suggestions'] ?? [];
            } else {
                // Re-run validation to get error details
                $validation_service = new AddressValidationService($conn, true);
                $validation_result = $validation_service->validateOrderAddressWithErrorHandling($bm_order_id);
                
                if (!$validation_result['success']) {
                    $validation_error = $validation_result;
                    $suggestions = $validation_result['suggestions'] ?? [];
                    $_SESSION['validation_error_' . $bm_order_id] = $validation_error;
                }
            }
        }
        
        mysqli_stmt_close($stmt);
        
    } catch (Exception $e) {
        $error_message = "Failed to load order data: " . $e->getMessage();
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Address Manual Review - Order <?php echo htmlspecialchars($bm_order_id); ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1000px;
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
            color: #d32f2f;
            border-bottom: 3px solid #d32f2f;
            padding-bottom: 10px;
        }
        
        .error-info {
            background-color: #ffebee;
            color: #c62828;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
            border: 2px solid #ef5350;
        }
        
        .warning {
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            border: 1px solid #ffeaa7;
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
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
            border: 1px solid #dee2e6;
        }
        
        .suggestions {
            background-color: #e3f2fd;
            padding: 20px;
            border-radius: 4px;
            margin: 20px 0;
            border: 1px solid #2196f3;
        }
        
        .suggestion-item {
            background-color: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border: 1px solid #ddd;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .suggestion-item:hover {
            background-color: #f0f8ff;
            border-color: #2196f3;
        }
        
        .suggestion-item.selected {
            background-color: #e3f2fd;
            border-color: #2196f3;
            border-width: 2px;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        
        input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
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
            margin-top: 10px;
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
        
        .form-row {
            display: flex;
            gap: 15px;
        }
        
        .form-row .form-group {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Address Manual Review</h1>
        
        <?php if ($success_message): ?>
            <div class="success">
                <strong>✅ Success:</strong> <?php echo htmlspecialchars($success_message); ?>
            </div>
        <?php endif; ?>
        
        <?php if ($error_message): ?>
            <div class="error">
                <strong>❌ Error:</strong> <?php echo htmlspecialchars($error_message); ?>
            </div>
        <?php endif; ?>
        
        <?php if ($validation_error): ?>
            <div class="error-info">
                <h3>⚠️ Address Validation Issue</h3>
                <p><strong>Order ID:</strong> <?php echo htmlspecialchars($bm_order_id); ?></p>
                <p><strong>Error Type:</strong> <?php echo htmlspecialchars($validation_error['error_type'] ?? 'Unknown'); ?></p>
                <p><strong>Message:</strong> <?php echo htmlspecialchars($validation_error['message'] ?? 'No message'); ?></p>
                <?php if (!empty($validation_error['details'])): ?>
                    <p><strong>Details:</strong> <?php echo htmlspecialchars($validation_error['details']); ?></p>
                <?php endif; ?>
                <?php if (!empty($validation_error['guidance'])): ?>
                    <p><strong>Guidance:</strong> <?php echo htmlspecialchars($validation_error['guidance']); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <?php if ($address_data): ?>
            <h2>📍 Original Address</h2>
            <div class="address-display">
                <strong>Customer:</strong> <?php echo htmlspecialchars($address_data['first_name'] . ' ' . $address_data['last_name']); ?><br>
                <strong>Street:</strong> <?php echo htmlspecialchars($address_data['street']); ?><br>
                <?php if (!empty($address_data['street_2'])): ?>
                    <strong>Street 2:</strong> <?php echo htmlspecialchars($address_data['street_2']); ?><br>
                <?php endif; ?>
                <strong>City:</strong> <?php echo htmlspecialchars($address_data['city']); ?><br>
                <strong>Postcode:</strong> <?php echo htmlspecialchars($address_data['postal_code']); ?><br>
                <strong>Country:</strong> <?php echo htmlspecialchars($address_data['country']); ?>
            </div>
            
            <?php if (!empty($suggestions)): ?>
                <h2>💡 Suggested Addresses</h2>
                <div class="suggestions">
                    <p>We found similar addresses that might be correct. Click on one to select it:</p>
                    
                    <form method="POST" action="" id="suggestionForm">
                        <input type="hidden" name="action" value="select_suggestion">
                        <input type="hidden" name="bm_order_id" value="<?php echo htmlspecialchars($bm_order_id); ?>">
                        <input type="hidden" name="selected_udprn" id="selectedUdprn">
                        
                        <?php foreach ($suggestions as $index => $suggestion): ?>
                            <div class="suggestion-item" onclick="selectSuggestion(<?php echo $suggestion['udprn']; ?>, this)">
                                <strong><?php echo htmlspecialchars($suggestion['suggestion']); ?></strong><br>
                                <small>UDPRN: <?php echo htmlspecialchars($suggestion['udprn']); ?></small>
                            </div>
                        <?php endforeach; ?>
                        
                        <button type="submit" id="selectButton" style="display: none;">Use Selected Address</button>
                    </form>
                </div>
            <?php endif; ?>
            
            <h2>✏️ Manual Address Edit</h2>
            <div class="warning">
                <strong>Manual Override:</strong> You can manually edit the address below. 
                The system will attempt to validate your changes.
            </div>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="validate_manual_address">
                <input type="hidden" name="bm_order_id" value="<?php echo htmlspecialchars($bm_order_id); ?>">
                
                <div class="form-group">
                    <label for="street">Street Address *</label>
                    <input type="text" id="street" name="street" value="<?php echo htmlspecialchars($address_data['street']); ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="street_2">Street Address 2</label>
                    <input type="text" id="street_2" name="street_2" value="<?php echo htmlspecialchars($address_data['street_2']); ?>">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="city">City *</label>
                        <input type="text" id="city" name="city" value="<?php echo htmlspecialchars($address_data['city']); ?>" required>
                    </div>
                    <div class="form-group">
                        <label for="postal_code">Postcode *</label>
                        <input type="text" id="postal_code" name="postal_code" value="<?php echo htmlspecialchars($address_data['postal_code']); ?>" required>
                    </div>
                </div>
                
                <button type="submit">🔍 Validate Manual Address</button>
                <button type="button" class="danger" onclick="window.history.back();">❌ Cancel</button>
            </form>
        <?php else: ?>
            <div class="error">
                <strong>Order Not Found:</strong> Please provide a valid BackMarket order ID.
            </div>
        <?php endif; ?>
    </div>

    <script>
        let selectedUdprn = null;
        
        function selectSuggestion(udprn, element) {
            // Remove selection from all items
            document.querySelectorAll('.suggestion-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Add selection to clicked item
            element.classList.add('selected');
            
            // Store selected UDPRN
            selectedUdprn = udprn;
            document.getElementById('selectedUdprn').value = udprn;
            document.getElementById('selectButton').style.display = 'inline-block';
        }
    </script>
</body>
</html>