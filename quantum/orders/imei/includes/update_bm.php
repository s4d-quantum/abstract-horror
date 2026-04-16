<?php

// Load environment variables
require_once __DIR__ . '/../../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->safeLoad();
require_once dirname(__DIR__, 3) . '/sales/imei_orders/includes/dpd_printer_helper.php';

// Ensure PHP 7.3+
if (version_compare(PHP_VERSION, '7.3.0', '<')) {
    die("This script requires PHP 7.3 or higher.\n");
}

// Parse CLI arguments manually (no getopt for simplicity)
$argv = $_SERVER['argv'];
$args = [];
for ($i = 1; $i < count($argv); $i++) {
    if (strpos($argv[$i], '-') === 0 && $i + 1 < count($argv)) {
        $key = substr($argv[$i], 1);
        $args[$key] = $argv[++$i];
    }
}

$bm_order_id = $args['oid'] ?? null;
$imei        = $args['imei'] ?? null;
$tracking_no = $args['tr']  ?? null;
$delivery_note_printer = $args['dn'] ?? null;

if (!$bm_order_id || !$imei || !$tracking_no) {
    die("Usage: php " . basename(__FILE__) . " -oid <BM_ORDER_ID> -imei <IMEI> -tr <TRACKING_NO> [-dn <laserleft|laserright|lasernew>]\n");
}

if (!ctype_digit($bm_order_id)) {
    die("Error: -oid must be a numeric order ID.\n");
}

// DB Config
$db_host = $_ENV['DB_HOST'];
$db_user = $_ENV['DB_USERNAME'];
$db_pass = $_ENV['DB_PASSWORD'];
$db_name = $_ENV['DB_DATABASE'];

// -------------------------------
// 💾 STEP 1: Fetch delivery_note URL from tbl_bm2
// -------------------------------
$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($mysqli->connect_error) {
    die("⛔ Database connection failed: " . $mysqli->connect_error . "\n");
}

$mysqli->set_charset("utf8mb4");

$escape = function($str) use ($mysqli) {
    return $mysqli->real_escape_string((string)$str);
};

$bm_order_id_esc = (int)$bm_order_id;

$result = $mysqli->query("
    SELECT delivery_note FROM tbl_bm2 
    WHERE bm_order_id = {$bm_order_id_esc} 
    LIMIT 1
");

if (!$result || $result->num_rows === 0) {
    die("⛔ No record found in tbl_bm2 for bm_order_id {$bm_order_id}\n");
}

$row = $result->fetch_assoc();
$delivery_note_url = $row['delivery_note'];

if (empty($delivery_note_url)) {
    die("⛔ delivery_note URL is empty in tbl_bm2 for order {$bm_order_id}\n");
}

$result->free();

echo "✅ Found delivery note URL.\n";

// -------------------------------
// 🌐 STEP 2: Get orderlines from BackMarket API
// -------------------------------
$api_url = "https://www.backmarket.fr/ws/orders/{$bm_order_id}";
$auth_header = $_ENV['BM_API_AUTH'] ?? null;
if (!$auth_header) {
    die("⛔ BM_API_AUTH is not configured in the environment.\n");
}
if (stripos($auth_header, 'Basic ') !== 0) {
    $auth_header = 'Basic ' . $auth_header;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_ENCODING, '');

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: ' . $auth_header,
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    die("⛔ BM API GET failed: HTTP {$http_code}\nResponse: {$response}\n");
}

$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    die("⛔ JSON Decode Error: " . json_last_error_msg() . "\n");
}

if (empty($data['orderlines']) || !is_array($data['orderlines'])) {
    die("⛔ No orderlines found in BM API response.\n");
}

// Get first orderline SKU (assuming single item per order)
$sku = $data['orderlines'][0]['listing'] ?? null;

if (!$sku) {
    die("⛔ Could not extract SKU from orderlines.\n");
}

echo "✅ Extracted SKU: {$sku}\n";

// -------------------------------
// 🔄 STEP 3: Move order to state 2 (if not already)
// -------------------------------
if (($data['orderlines'][0]['state'] ?? 0) != 2) {
    echo "🔄 Moving order to state 2...\n";

    $post_data = json_encode([
        'order_id' => (int)$bm_order_id,
        'new_state' => 2,
        'sku' => $sku
    ]);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/curl_cookie.txt');
    curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/curl_cookie.txt');
    curl_setopt($ch, CURLOPT_ENCODING, '');

    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Authorization: ' . $auth_header,
        'Content-Type: application/json',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        die("⛔ BM API POST (state 2) failed: HTTP {$http_code}\nResponse: {$response}\n");
    }

    echo "✅ Order moved to state 2.\n";
} else {
    echo "✅ Order already in state 2.\n";
}

// -------------------------------
// 🚚 STEP 4: Update order to state 3 with IMEI, tracking, etc.
// -------------------------------
echo "🚚 Updating order to state 3 with shipment data...\n";

// Set shipping date to tomorrow at 3 PM UTC
$shipping_date = date('Y-m-d\TH:i:s\Z', strtotime('tomorrow 15:00'));

$post_data = json_encode([
    'order_id' => (int)$bm_order_id,
    'new_state' => 3,
    'imei' => $imei,
    'tracking_number' => $tracking_no,
    'shipper' => 'DPD UK',
    'date_shipping' => $shipping_date
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_ENCODING, '');

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: ' . $auth_header,
    'Content-Type: application/json',
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    die("⛔ BM API POST (state 3) failed: HTTP {$http_code}\nResponse: {$response}\n");
}

echo "✅ Order updated to state 3 with IMEI, tracking, and shipping date.\n";

// -------------------------------
// 🖨️ STEP 5: Download PDF and send to laser webhook
// -------------------------------
echo "🖨️ Downloading delivery note PDF...\n";

$temp_pdf = "/tmp/delivery_{$bm_order_id}.pdf";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $delivery_note_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_ENCODING, '');

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
]);

$pdf_data = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200 || empty($pdf_data)) {
    die("⛔ Failed to download PDF from: {$delivery_note_url}\n");
}

file_put_contents($temp_pdf, $pdf_data);
echo "✅ PDF saved to {$temp_pdf}\n";

// Send to laser webhook
echo "📤 Sending PDF to laser print webhook...\n";

$laserConfig = getBmDeliveryNotePrinterConfig($delivery_note_printer);
if (!$laserConfig['success']) {
    die("⛔ " . $laserConfig['message'] . "\n");
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $laserConfig['url']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $pdf_data);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: ' . $laserConfig['api_key'],
    'Content-Type: application/pdf',
    'Content-Length: ' . strlen($pdf_data),
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    echo "⚠️ Laser webhook returned HTTP {$http_code}\nResponse: {$response}\n";
} else {
    echo "✅ PDF sent to laser printer successfully.\n";
}

// Cleanup
unlink($temp_pdf);

echo "🎉 BM order {$bm_order_id} fully updated and delivery note printed.\n";

$mysqli->close();

?>
