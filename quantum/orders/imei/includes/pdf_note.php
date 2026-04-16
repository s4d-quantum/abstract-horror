<?php
// Generates a dispatch note PDF (wkhtmltopdf) and posts it to the laser printer webhook.
// All sensitive config is taken from .env

error_reporting(E_ALL);
ini_set('display_errors', 0);

// Load env
require_once __DIR__ . '/../../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->safeLoad();

// Input
$ord_id = $_GET['ord_id'] ?? '';
$ord_id = preg_replace('/[^0-9]/', '', (string)$ord_id);
if ($ord_id === '') {
    http_response_code(400);
    exit('Order ID is required.');
}

// DB connection from env
$dbHost = $_ENV['DB_HOST'] ?? 'localhost';
$dbUser = $_ENV['DB_USERNAME'] ?? '';
$dbPass = $_ENV['DB_PASSWORD'] ?? '';
$dbName = $_ENV['DB_DATABASE'] ?? '';

$conn = mysqli_connect($dbHost, $dbUser, $dbPass, $dbName);
if (!$conn) {
    http_response_code(500);
    exit('Database connection failed: ' . mysqli_connect_error());
}

// Fetch order
$stmt = mysqli_prepare($conn, 'SELECT * FROM tbl_orders WHERE order_id = ? LIMIT 1');
if (!$stmt) { http_response_code(500); exit('Prepare failed: ' . mysqli_error($conn)); }
mysqli_stmt_bind_param($stmt, 's', $ord_id);
mysqli_stmt_execute($stmt);
$order_result = mysqli_stmt_get_result($stmt);
if (!$order_result || mysqli_num_rows($order_result) === 0) {
    mysqli_stmt_close($stmt);
    http_response_code(404);
    exit('Order not found.');
}
$order = mysqli_fetch_assoc($order_result);
mysqli_stmt_close($stmt);

// Fetch customer name
$customer_name = 'Unknown Customer';
if (!empty($order['customer_id'])) {
    $stmt = mysqli_prepare($conn, 'SELECT name FROM tbl_customers WHERE customer_id = ? LIMIT 1');
    if ($stmt) {
        mysqli_stmt_bind_param($stmt, 's', $order['customer_id']);
        mysqli_stmt_execute($stmt);
        $customer_result = mysqli_stmt_get_result($stmt);
        if ($customer_result) {
            $customer = mysqli_fetch_assoc($customer_result);
            if ($customer && !empty($customer['name'])) { $customer_name = $customer['name']; }
        }
        mysqli_stmt_close($stmt);
    }
}
$is_backmarket = (isset($order['customer_id']) && $order['customer_id'] === 'CST-78');
$display_customer = $is_backmarket ? 'BackMarket Consumer' : $customer_name;

// Fetch and group items
$stmt = mysqli_prepare($conn, '
    SELECT im.item_gb, im.item_color, tc.item_details, cat.title AS brand_title, gr.title AS grade_title
    FROM tbl_orders ord
    INNER JOIN tbl_imei im ON ord.item_imei = im.item_imei
    INNER JOIN tbl_tac tc ON im.item_tac = tc.item_tac
    LEFT JOIN tbl_categories cat ON tc.item_brand = cat.category_id
    LEFT JOIN tbl_grades gr ON im.item_grade = gr.grade_id
    WHERE ord.order_id = ?
');
if (!$stmt) { http_response_code(500); exit('Prepare failed: ' . mysqli_error($conn)); }
mysqli_stmt_bind_param($stmt, 's', $ord_id);
mysqli_stmt_execute($stmt);
$item_query = mysqli_stmt_get_result($stmt);

$items = [];
if ($item_query) {
    while ($row = mysqli_fetch_assoc($item_query)) {
        $description_parts = [
            $row['brand_title'] ?? '',
            $row['item_details'] ?? '',
            $row['item_color'] ?? '',
            ($row['item_gb'] ? ($row['item_gb'] . 'GB') : ''),
            ($row['grade_title'] ? ('Grade ' . $row['grade_title']) : ''),
        ];
        $description = trim(preg_replace('/\s+/', ' ', implode(' ', array_filter($description_parts))));
        if ($description === '') { $description = 'Item'; }
        if (!isset($items[$description])) { $items[$description] = ['description' => $description, 'qty' => 0]; }
        $items[$description]['qty']++;
    }
}
mysqli_stmt_close($stmt);
$total_qty = array_sum(array_column($items, 'qty'));

// Logo image
$logoFileCandidates = [
    '/var/www/html/assets/img/logo.png',
    '/var/www/html/assets/img/logo.jpeg',
    '/var/www/html/assets/img/logo.jpg',
    '/var/www/html/assets/img/quantum-logo.jpg',
    '/var/www/html/assets/img/demo_logo.jpg',
];
$logoFile = null;
foreach ($logoFileCandidates as $f) {
    if (file_exists($f) && is_readable($f)) { $logoFile = $f; break; }
}
$logoDataUri = '';
if ($logoFile) {
    $mime = mime_content_type($logoFile) ?: 'image/png';
    $data = @file_get_contents($logoFile);
    if ($data !== false) {
        $base64 = base64_encode($data);
        $logoDataUri = "data:$mime;base64,$base64";
    }
}
$logoFileUrl = $logoFile ? ('file://' . realpath($logoFile)) : '';

// Build HTML
ob_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dispatch Note IO-<?= htmlspecialchars($ord_id, ENT_QUOTES) ?></title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; margin: 0; padding: 20px; }
        .container { width: 100%; padding: 0; display: flex; flex-direction: column; }
        .header, .info-section, .bottom-section { display: flex; justify-content: space-between; }
        .header { align-items: flex-start; margin-bottom: 40px; }
        .info-section { margin-bottom: 20px; }
        .bottom-section { margin-top: 20px; }
        .header-left, .header-right, .customer-info, .date-info, .dispatch-details, .signature-area { width: 48%; }
        .header-left img { width: 45mm; height: auto; display: block; object-fit: contain; }
        .dispatch-note-title { font-size: 24px; font-weight: bold; margin-top: 10px; }
        .header-right { text-align: right; line-height: 1.4; }
        p { margin: 0 0 8px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tfoot td { font-weight: bold; }
        .signature-area p { margin-bottom: 20px; }
        .signature-line { display: block; border-bottom: 1px solid #000; min-height: 20px; }
        .footer-note { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; }
    </style>
    </head>
<body>
<div class="container">
    <div class="header">
        <div class="header-left">
            <?php if ($logoDataUri): ?>
                <img src="<?= $logoDataUri ?>" alt="S4D Limited Logo">
            <?php elseif ($logoFileUrl): ?>
                <img src="<?= htmlspecialchars($logoFileUrl, ENT_QUOTES) ?>" alt="S4D Limited Logo">
            <?php else: ?>
                <div style="height:50px; width:200px; background:#eee; display:flex; align-items:center; justify-content:center;">
                    <strong>S4D</strong>
                </div>
            <?php endif; ?>
            <div class="dispatch-note-title">Dispatch Note</div>
        </div>
        <div class="header-right">
            <strong>S4D Limited</strong><br>
            Unit 2 Parkhall Business Village<br>
            Stoke-on-Trent, Staffordshire<br>
            ST3 5XA<br>
            01782 330780<br>
            phil@s4dltd.com<br>
            VAT Registration No: 202 7041 62<br>
            EROI No.: 202704162000
        </div>
    </div>

    <div class="info-section">
        <div class="customer-info">
            <p><strong>Customer</strong><br><?= htmlspecialchars($display_customer, ENT_QUOTES) ?></p>
            <p><strong>Dispatch#:</strong> IO-<?= htmlspecialchars($ord_id, ENT_QUOTES) ?></p>
        </div>
        <div class="date-info">
            <p><strong>Date:</strong> <?= htmlspecialchars($order['date'] ?? date('Y-m-d'), ENT_QUOTES) ?></p>
        </div>
    </div>

    <table>
        <thead><tr><th>Description</th><th style="width: 15%; text-align: center;">Qty</th></tr></thead>
        <tbody>
            <?php if (!empty($items)): foreach ($items as $item): ?>
                <tr><td><?= htmlspecialchars($item['description'], ENT_QUOTES) ?></td><td style="text-align:center;">&nbsp;<?= (int)$item['qty'] ?></td></tr>
            <?php endforeach; else: ?>
                <tr><td colspan="2" style="text-align:center;">No items found for this order.</td></tr>
            <?php endif; ?>
        </tbody>
        <tfoot><tr><td style="text-align: right;"><strong>Total</strong></td><td style="text-align:center;">&nbsp;<?= (int)$total_qty ?></td></tr></tfoot>
    </table>

    <div class="bottom-section">
        <div class="dispatch-details">
            <p><strong>Total # of Boxes:</strong> <?= (int)($order['total_boxes'] ?? 0) ?></p>
            <p><strong>Total # of Pallets:</strong> <?= (int)($order['total_pallets'] ?? 0) ?></p>
            <p><strong>Courier:</strong> <?= htmlspecialchars($order['delivery_company'] ?? '', ENT_QUOTES) ?></p>
            <p><strong>Tracking No:</strong> <?= htmlspecialchars($order['tracking_no'] ?? '', ENT_QUOTES) ?></p>
        </div>
        <div class="signature-area">
            <p><strong>Dispatched by:</strong><span class="signature-line"></span></p>
            <p><strong>Received by Signature:</strong><span class="signature-line"></span></p>
            <p><strong>Received by Print:</strong><span class="signature-line"></span></p>
        </div>
    </div>

    <div class="footer-note">ANY DISCREPANCIES MUST BE REPORTED WITHIN 48 HOURS.</div>
</div>
</body>
</html>
<?php
$html = ob_get_clean();

// Temp files
$tmpDir = sys_get_temp_dir();
$htmlFile = $tmpDir . '/' . uniqid('dispatch_', true) . '.html';
$pdfFile = $tmpDir . '/' . uniqid('dispatch_', true) . '.pdf';
file_put_contents($htmlFile, $html);

// wkhtmltopdf
$safeHtmlFile = escapeshellarg($htmlFile);
$safePdfFile = escapeshellarg($pdfFile);
$pdfFilename = 'dispatch_note_IO-' . preg_replace('/[^A-Za-z0-9_\-]/', '', $ord_id) . '.pdf';

$wkhtml = '/usr/bin/wkhtmltopdf';
if (!file_exists($wkhtml)) {
    $which = trim(shell_exec('which wkhtmltopdf 2>/dev/null'));
    if ($which) { $wkhtml = $which; }
}

$cmd = escapeshellcmd($wkhtml) . ' --enable-local-file-access --page-size A4 --quiet ' . $safeHtmlFile . ' ' . $safePdfFile;
exec($cmd . ' 2>&1', $out, $rc);
if ($rc !== 0) {
    header('Content-Type: text/plain');
    echo "wkhtmltopdf failed (exit code $rc)\n";
    echo "Command: $cmd\n";
    echo "Output:\n" . implode("\n", $out) . "\n";
    @unlink($htmlFile);
    @unlink($pdfFile);
    exit;
}

// Print webhook from env
$webhookUrl = $_ENV['PRINT_WEBHOOK_URL'] ?? 'https://zebra.quantum-cloud.co.uk/laser';
$apiKey = $_ENV['PRINT_API_KEY'] ?? ($_ENV['LASER_API_KEY'] ?? '');

$pdfData = @file_get_contents($pdfFile);
if ($pdfData === false) {
    error_log("Failed to read generated PDF: $pdfFile");
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $pdfFilename . '"');
    header('Content-Length: ' . filesize($pdfFile));
    readfile($pdfFile);
    @unlink($htmlFile);
    @unlink($pdfFile);
    exit;
}

$ch = curl_init($webhookUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/pdf',
    'X-API-Key: ' . $apiKey,
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $pdfData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    @unlink($htmlFile);
    @unlink($pdfFile);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'sent',
        'http_code' => $httpCode,
        'webhook_response' => substr($response ?? '', 0, 200),
    ]);
    exit;
}

// Fallback: stream the PDF to the browser
error_log("Print webhook failed: HTTP $httpCode - $curlErr - response: " . substr($response ?? '', 0, 500));
if (file_exists($pdfFile)) {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $pdfFilename . '"');
    header('Content-Length: ' . filesize($pdfFile));
    readfile($pdfFile);
} else {
    header('HTTP/1.1 500 Internal Server Error');
    echo 'Error: Could not generate PDF or send to print webhook.';
}
@unlink($htmlFile);
@unlink($pdfFile);
exit;

