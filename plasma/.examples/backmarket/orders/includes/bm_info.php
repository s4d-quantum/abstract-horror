<?php

// Load environment variables
require_once __DIR__ . '/../../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->safeLoad();

// this module pulls data from backmarket api using backmarket order_id
// and stores/updates it in local MySQL database (tbl_bm2)
// Usage: php bm_info.php <order_id>

// Ensure PHP 7.3+
if (version_compare(PHP_VERSION, '7.3.0', '<')) {
    die("This script requires PHP 7.3 or higher.\n");
}

// Get order_id from CLI
$order_id = null;

if (isset($argv[1])) {
    $order_id = trim($argv[1]);
} elseif (isset($_GET['order_id'])) {
    $order_id = trim($_GET['order_id']);
} else {
    die("Usage: php " . basename(__FILE__) . " <order_id>\n");
}

if (!ctype_digit($order_id)) {
    die("Error: order_id must be a positive integer.\n");
}

// DB Config
$db_host = $_ENV['DB_HOST'];
$db_user = $_ENV['DB_USERNAME'];
$db_pass = $_ENV['DB_PASSWORD'];
$db_name = $_ENV['DB_DATABASE'];
$db_table = 'tbl_bm2';

// API Config
$api_url = $_ENV['BM_API_URL_BASE'] . "/{$order_id}";
$auth_header = $_ENV['BM_API_AUTH'];

// -------------------------------
// 🚀 CLOUDFLARE BYPASS + GZIP SUPPORT 🚀
// -------------------------------
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_COOKIEJAR, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_COOKIEFILE, '/tmp/curl_cookie.txt');
curl_setopt($ch, CURLOPT_ENCODING, ''); // Handle gzip/deflate

curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Authorization: Basic ' . $auth_header,
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language: en-US,en;q=0.9',
    'Accept-Encoding: gzip, deflate, br',
    'Connection: keep-alive',
    'Upgrade-Insecure-Requests: 1',
    'Sec-Fetch-Dest: document',
    'Sec-Fetch-Mode: navigate',
    'Sec-Fetch-Site: none',
    'Sec-Fetch-User: ?1',
    'Cache-Control: max-age=0',
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 403 || (strpos($response, 'Cloudflare') !== false && !json_decode($response))) {
    file_put_contents('/tmp/cloudflare_debug.html', $response);
    die("⛔ Blocked by Cloudflare (HTTP $http_code). Response saved to /tmp/cloudflare_debug.html\n" .
        "➡️ Try accessing manually: $api_url\n");
}

if ($http_code !== 200) {
    die("⛔ API Error: HTTP $http_code\nResponse: $response\n");
}

$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    file_put_contents("/tmp/json_debug_{$order_id}.txt", $response);
    die("⛔ JSON Decode Error: " . json_last_error_msg() . "\nRaw response saved to /tmp/json_debug_{$order_id}.txt\n");
}

if (!isset($data['order_id'])) {
    die("⛔ Invalid API response: 'order_id' not found.\n");
}

// -------------------------------
// 🗃️ Extract Data
// -------------------------------
$address = $data['shipping_address'] ?? $data['billing_address'] ?? [];

$bm_order_id    = (int)($data['order_id'] ?? 0);
$company        = $address['company'] ?? '';
$first_name     = $address['first_name'] ?? '';
$last_name      = $address['last_name'] ?? '';
$street         = $address['street'] ?? '';
$street_2       = $address['street2'] ?? ''; // API uses "street2"
$postal_code    = $address['postal_code'] ?? '';
$country        = $address['country'] ?? '';
$city           = $address['city'] ?? '';
$phone          = $address['phone'] ?? '';
$email          = $address['email'] ?? '';
$delivery_note  = $data['delivery_note'] ?? '';
$orderlines     = isset($data['orderlines']) ? json_encode($data['orderlines'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null;
$price          = isset($data['price']) ? (float)$data['price'] : 0.00;

// -------------------------------
// 💾 MySQL: Connect & Upsert (NO booking columns)
// -------------------------------
$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($mysqli->connect_error) {
    die("⛔ Database connection failed: " . $mysqli->connect_error . "\n");
}

$mysqli->set_charset("utf8mb4");

// 🔍 DEBUG: Confirm connected DB and table
$result = $mysqli->query("SELECT DATABASE() as current_db");
if ($result) {
    $row = $result->fetch_assoc();
    echo "🔌 Connected to database: " . $row['current_db'] . "\n";
    $result->free();
}

$result = $mysqli->query("SHOW TABLES LIKE 'tbl_bm2'");
if ($result->num_rows === 0) {
    die("⛔ Table 'tbl_bm2' does not exist in database '{$db_name}'\n");
}
echo "✅ Table 'tbl_bm2' exists.\n";

// Escape all values
$escape = function($str) use ($mysqli) {
    return $mysqli->real_escape_string((string)$str);
};

$bm_order_id_esc = (int)$bm_order_id;
$company_esc     = $escape($company);
$first_name_esc  = $escape($first_name);
$last_name_esc   = $escape($last_name);
$street_esc      = $escape($street);
$street_2_esc    = $escape($street_2);
$postal_code_esc = $escape($postal_code);
$country_esc     = $escape($country);
$city_esc        = $escape($city);
$phone_esc       = $escape($phone);
$email_esc       = $escape($email);
$delivery_note_esc = $escape($delivery_note);
$orderlines_esc  = $orderlines !== null ? $escape($orderlines) : 'NULL';
$price_esc       = (float)$price;

// Check if record exists
$result = $mysqli->query("SELECT id FROM {$db_table} WHERE bm_order_id = {$bm_order_id_esc}");

if ($result && $result->num_rows > 0) {
    // UPDATE — only fields we care about
    $sql = "
        UPDATE {$db_table} SET
            company = '{$company_esc}',
            first_name = '{$first_name_esc}',
            last_name = '{$last_name_esc}',
            street = '{$street_esc}',
            street_2 = '{$street_2_esc}',
            postal_code = '{$postal_code_esc}',
            country = '{$country_esc}',
            city = '{$city_esc}',
            phone = '{$phone_esc}',
            email = '{$email_esc}',
            delivery_note = '{$delivery_note_esc}',
            orderlines = " . ($orderlines !== null ? "'{$orderlines_esc}'" : "NULL") . ",
            price = {$price_esc}
        WHERE bm_order_id = {$bm_order_id_esc}
    ";
} else {
    // INSERT — only fields we care about (booking columns omitted → auto NULL)
    $sql = "
        INSERT INTO {$db_table} (
            bm_order_id, company, first_name, last_name, street, street_2,
            postal_code, country, city, phone, email, delivery_note, orderlines, price
        ) VALUES (
            {$bm_order_id_esc},
            '{$company_esc}',
            '{$first_name_esc}',
            '{$last_name_esc}',
            '{$street_esc}',
            '{$street_2_esc}',
            '{$postal_code_esc}',
            '{$country_esc}',
            '{$city_esc}',
            '{$phone_esc}',
            '{$email_esc}',
            '{$delivery_note_esc}',
            " . ($orderlines !== null ? "'{$orderlines_esc}'" : "NULL") . ",
            {$price_esc}
        )
    ";
}

if (!$mysqli->query($sql)) {
    die("⛔ Database error: " . $mysqli->error . "\nSQL: " . $sql . "\n");
}

echo "✅ Order ID {$bm_order_id} processed successfully and stored in database.\n";

$mysqli->close();

?>