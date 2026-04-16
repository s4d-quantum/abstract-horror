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

// Get sales_order_id from CLI
$sales_order_id = null;

if (isset($argv[1])) {
    $sales_order_id = trim($argv[1]);
} else {
    die("Usage: php " . basename(__FILE__) . " <sales_order_id>\n");
}

if (!ctype_digit($sales_order_id)) {
    die("Error: sales_order_id must be a positive integer.\n");
}

// DB Config
$db_host = $_ENV['DB_HOST'];
$db_user = $_ENV['DB_USERNAME'];
$db_pass = $_ENV['DB_PASSWORD'];
$db_name = $_ENV['DB_DATABASE'];

// -------------------------------
// 💾 STEP 1: Get po_ref (BM order_id) and item_code (IMEI) from tbl_imei_sales_orders
// -------------------------------
$mysqli = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($mysqli->connect_error) {
    die("⛔ Database connection failed: " . $mysqli->connect_error . "\n");
}

$mysqli->set_charset("utf8mb4");

$escape = function($str) use ($mysqli) {
    return $mysqli->real_escape_string((string)$str);
};

$sales_order_id_esc = (int)$sales_order_id;

$result = $mysqli->query("
    SELECT po_ref, item_code FROM tbl_imei_sales_orders 
    WHERE order_id = {$sales_order_id_esc} 
    LIMIT 1
");

if (!$result || $result->num_rows === 0) {
    die("⛔ No record found in tbl_imei_sales_orders for order_id {$sales_order_id}\n");
}

$row = $result->fetch_assoc();
$bm_order_id = trim($row['po_ref']);
$imei        = trim($row['item_code']);

$result->free();

if (!ctype_digit($bm_order_id)) {
    die("⛔ Invalid po_ref (BM order_id): '{$bm_order_id}'\n");
}

if (empty($imei)) {
    die("⛔ IMEI (item_code) is empty for order_id {$sales_order_id}\n");
}

echo "✅ Found BM Order ID: {$bm_order_id}\n";
echo "✅ Found IMEI: {$imei}\n";

// -------------------------------
// 🔄 STEP 2: Run bm_info.php to fetch & store BM data
// -------------------------------
echo "🔄 Running bm_info.php to fetch order data...\n";

$cmd = "php bm_info.php " . escapeshellarg($bm_order_id);
exec($cmd, $output, $exit_code);

if ($exit_code !== 0) {
    die("⛔ bm_info.php failed with exit code {$exit_code}\nOutput: " . implode("\n", $output) . "\n");
}

echo "✅ bm_info.php completed successfully.\n";

// -------------------------------
// 💾 STEP 3: Fetch required fields from tbl_bm2 (including consignment_no for tracking)
// -------------------------------
$result = $mysqli->query("
    SELECT 
        first_name, last_name, phone, street, city, postal_code, email, price, consignment_no
    FROM tbl_bm2 
    WHERE bm_order_id = {$bm_order_id_esc} 
    LIMIT 1
");

if (!$result || $result->num_rows === 0) {
    die("⛔ No record found in tbl_bm2 for bm_order_id {$bm_order_id}\n");
}

$order_data = $result->fetch_assoc();
$result->free();

// Validate required fields
$required_fields = ['first_name', 'last_name', 'phone', 'street', 'city', 'postal_code', 'email', 'price', 'consignment_no'];
foreach ($required_fields as $field) {
    if (empty($order_data[$field])) {
        echo "⚠️ Warning: {$field} is empty or null.\n";
    }
}

$tracking_no = $order_data['consignment_no'];

if (empty($tracking_no)) {
    die("⛔ Tracking number (consignment_no) is missing in tbl_bm2 for order {$bm_order_id}\n");
}

echo "✅ Found Tracking Number: {$tracking_no}\n";

// -------------------------------
// 🚚 STEP 4: Run bookdpd.php to book shipment
// -------------------------------
echo "📦 Booking DPD shipment...\n";

// Fetch BM collection cut-off time from settings (fallback to 13:30)
$bm_cutoff = '13:30';
$col_check = mysqli_query($conn, "SHOW COLUMNS FROM tbl_settings LIKE 'bm_collection_cutoff'");
if ($col_check && mysqli_num_rows($col_check) > 0) {
    $rs = mysqli_query($conn, "SELECT bm_collection_cutoff AS cutoff FROM tbl_settings LIMIT 1");
    if ($rs) {
        $row = mysqli_fetch_assoc($rs);
        if (!empty($row['cutoff']) && preg_match('/^([01]\\d|2[0-3]):[0-5]\\d$/', $row['cutoff'])) {
            $bm_cutoff = $row['cutoff'];
        }
    }
}

$cmd = sprintf(
    "php bookdpd.php --fn %s --ln %s --ph %s --st %s --city %s --pc %s --em %s --price %s --ref %s --cutoff %s --printer %s",
    escapeshellarg($order_data['first_name']),
    escapeshellarg($order_data['last_name']),
    escapeshellarg($order_data['phone']),
    escapeshellarg($order_data['street']),
    escapeshellarg($order_data['city']),
    escapeshellarg($order_data['postal_code']),
    escapeshellarg($order_data['email']),
    escapeshellarg($order_data['price']),
    escapeshellarg($bm_order_id),
    escapeshellarg($bm_cutoff),
    escapeshellarg(resolveDpdPrinter())
);

exec($cmd, $dpd_output, $dpd_exit_code);

if ($dpd_exit_code !== 0) {
    die("⛔ bookdpd.php failed with exit code {$dpd_exit_code}\nOutput: " . implode("\n", $dpd_output) . "\n");
}

// -------------------------------
// 🧩 STEP 5: Parse bookdpd.php output (JSON or key=value)
// -------------------------------
$dpd_result_raw = implode("\n", $dpd_output);
$dpd_result = json_decode($dpd_result_raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    // Fallback 1: parse key=value lines
    $dpd_result = [];
    foreach ($dpd_output as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $dpd_result[trim($key)] = trim($value);
        }
    }

    // Fallback 2: Look for JSON pattern in the raw output (handles concatenated JSON)
    if (empty($dpd_result)) {
        // Find all potential JSON objects and use the last one (most likely to be the response)
        $json_objects = [];
        $json_start = 0;

        while (($json_start = strpos($dpd_result_raw, '{', $json_start)) !== false) {
            $json_end = $json_start;
            $brace_count = 0;
            $in_string = false;
            $escaped = false;

            for ($i = $json_start; $i < strlen($dpd_result_raw); $i++) {
                $char = $dpd_result_raw[$i];

                if ($escaped) {
                    $escaped = false;
                    continue;
                }

                if ($char === '\\') {
                    $escaped = true;
                    continue;
                }

                if ($char === '"' && !$escaped) {
                    $in_string = !$in_string;
                    continue;
                }

                if (!$in_string) {
                    if ($char === '{') {
                        $brace_count++;
                    } elseif ($char === '}') {
                        $brace_count--;
                        if ($brace_count === 0) {
                            $json_end = $i;
                            break;
                        }
                    }
                }
            }

            if ($brace_count === 0 && $json_end > $json_start) {
                $json_string = substr($dpd_result_raw, $json_start, $json_end - $json_start + 1);
                $decoded = json_decode($json_string, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $json_objects[] = $decoded;
                }
            }

            $json_start++;
        }

        // Use the last JSON object found (most likely to be the final response)
        if (!empty($json_objects)) {
            $dpd_result = end($json_objects);
            echo "✅ Successfully extracted JSON from concatenated output (found " . count($json_objects) . " JSON objects, using last one)\n";
        }
    }

    if (empty($dpd_result)) {
        file_put_contents("/tmp/dpd_debug_{$bm_order_id}.txt", $dpd_result_raw);
        die("⛔ Could not parse bookdpd.php output. Saved to /tmp/dpd_debug_{$bm_order_id}.txt\n");
    }
}

// Extract values based on response format
if (isset($dpd_result['consignment_no']) && isset($dpd_result['parcel_no']) && isset($dpd_result['shipment_id'])) {
    // Format 1: Simplified response
    $consignment_no = $dpd_result['consignment_no'];
    $parcel_no      = $dpd_result['parcel_no'];
    $shipment_no    = $dpd_result['shipment_id'];
} elseif (isset($dpd_result['data']['consignmentDetail'][0]['consignmentNumber']) &&
          isset($dpd_result['data']['consignmentDetail'][0]['parcelNumbers'][0]) &&
          isset($dpd_result['data']['shipmentId'])) {
    // Format 2: Full API response
    $consignment_no = $dpd_result['data']['consignmentDetail'][0]['consignmentNumber'];
    $parcel_no      = $dpd_result['data']['consignmentDetail'][0]['parcelNumbers'][0];
    $shipment_no    = $dpd_result['data']['shipmentId'];
} else {
    // Fallback to key mapping for other formats
    $consignment_no = $dpd_result['consignmentNumber'] ?? $dpd_result['consignment_no'] ?? null;
    $parcel_no      = $dpd_result['parcelNumber']      ?? $dpd_result['parcel_no']      ?? null;
    $shipment_no    = $dpd_result['shipmentID']        ?? $dpd_result['shipment_no']    ?? null;
}

if (!$consignment_no || !$parcel_no || !$shipment_no) {
    die("⛔ Missing required shipment fields in bookdpd.php output: " . print_r($dpd_result, true) . "\n");
}

echo "✅ Shipment booked:\n";
echo "   Consignment: {$consignment_no}\n";
echo "   Parcel: {$parcel_no}\n";
echo "   Shipment ID: {$shipment_no}\n";

// -------------------------------
// 💾 STEP 6: Update tbl_bm2 with shipment info
// -------------------------------
$consignment_no_esc = $escape($consignment_no);
$parcel_no_esc      = $escape($parcel_no);
$shipment_no_esc    = $escape($shipment_no);

$sql = "
    UPDATE tbl_bm2 SET
        consignment_no = '{$consignment_no_esc}',
        parcel_no = '{$parcel_no_esc}',
        shipment_no = '{$shipment_no_esc}'
    WHERE bm_order_id = {$bm_order_id_esc}
";

if (!$mysqli->query($sql)) {
    die("⛔ Failed to update tbl_bm2: " . $mysqli->error . "\n");
}

echo "✅ tbl_bm2 updated with shipment info.\n";

// -------------------------------
// 🔄 STEP 7: Run update_bm.php to push IMEI + tracking to BackMarket and print label
// -------------------------------
echo "🔄 Running update_bm.php to update BackMarket and print label...\n";

$delivery_note_printer_endpoint = resolveBmDeliveryNotePrinter();
$cmd = sprintf(
    "php update_bm.php -oid %s -imei %s -tr %s -dn %s",
    escapeshellarg($bm_order_id),
    escapeshellarg($imei),
    escapeshellarg($consignment_no),
    escapeshellarg($delivery_note_printer_endpoint)
);

exec($cmd, $update_output, $update_exit_code);

if ($update_exit_code !== 0) {
    die("⛔ update_bm.php failed with exit code {$update_exit_code}\nOutput: " . implode("\n", $update_output) . "\n");
}

echo "✅ update_bm.php completed successfully.\n";
echo "🎉 Order {$sales_order_id} fully processed end-to-end.\n";

$mysqli->close();

?>
