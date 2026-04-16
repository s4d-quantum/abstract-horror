<?php
// BM Scratch Table Refresh Script
// Fetches orders from BackMarket API and updates bm_api_scratch table

// Load environment variables
require_once __DIR__ . '/../../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->safeLoad();

// Direct DB connection (as per example)
$host = $_ENV['DB_HOST'];
$username = $_ENV['DB_USERNAME'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_DATABASE'];

$mysqli = new mysqli($host, $username, $password, $database);
if ($mysqli->connect_errno) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'DB connection failed: ' . $mysqli->connect_error]);
    exit;
}

// Fetch JSON from BackMarket API with cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $_ENV['BM_API_URL'] . "?country_code=en-gb&state=3");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Accept: application/json",
    "Authorization: Basic " . $_ENV['BM_API_AUTH'],
    "User-Agent: BM-Sync-Script/1.0"
]);

$json = curl_exec($ch);
if (curl_errno($ch)) {
    $mysqli->close();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'cURL error: ' . curl_error($ch)]);
    exit;
}
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpcode !== 200) {
    $mysqli->close();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'BM API HTTP ' . $httpcode . ': ' . $json]);
    exit;
}

// Decode JSON
$data = json_decode($json, true);
if (!$data) {
    $mysqli->close();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Failed to decode BM API JSON']);
    exit;
}

// Reset scratch table
if (!$mysqli->query("TRUNCATE TABLE bm_api_scratch")) {
    $mysqli->close();
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Failed to truncate table: ' . $mysqli->error]);
    exit;
}

// Insert orders into scratch
$totalInserted = 0;
if (isset($data['results'])) {
    $stmt = $mysqli->prepare("
        INSERT INTO bm_api_scratch 
        (bm_order_id, customer_name, sku, imei, state, shipper, tracking_number, api_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");

    if (!$stmt) {
        $mysqli->close();
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => 'Prepare failed: ' . $mysqli->error]);
        exit;
    }

    foreach ($data['results'] as $order) {
        $bm_order_id = $order['order_id'];
        $customer_name = trim(($order['shipping_address']['first_name'] ?? '') . ' ' . ($order['shipping_address']['last_name'] ?? ''));
        $shipper = $order['shipper'] ?? '';
        $tracking_number = $order['tracking_number'] ?? '';
        $state = $order['state'];

        foreach ($order['orderlines'] as $line) {
            $sku = $line['listing'] ?? '';
            $imei = $line['imei'] ?? '';
            $line_state = $line['state'] ?? $state;

            $stmt->bind_param(
                "isssiss",
                $bm_order_id,
                $customer_name,
                $sku,
                $imei,
                $line_state,
                $shipper,
                $tracking_number
            );
            if (!$stmt->execute()) {
                $error = $stmt->error;
                $stmt->close();
                $mysqli->close();
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'error' => 'Insert failed: ' . $error]);
                exit;
            }
            $totalInserted++;
        }
    }

    $stmt->close();
}

$mysqli->close();
header('Content-Type: application/json');
echo json_encode(['success' => true, 'inserted' => $totalInserted, 'message' => 'BM sync complete']);
?>