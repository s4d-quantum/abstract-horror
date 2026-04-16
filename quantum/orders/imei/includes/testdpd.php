<?php
include dirname(__DIR__, 3) . '/db_config.php';

// Check if bm_order_id is provided
$shortopts = "";
$longopts = [
    "bm_order_id:",     // BM Order ID to test with
    "help",             // Show help
];
$opts = getopt($shortopts, $longopts);

if (isset($opts['help']) || !isset($opts['bm_order_id'])) {
    echo "Usage: php testdpd.php --bm_order_id <bm_order_id>\n";
    echo "Example: php testdpd.php --bm_order_id 12345\n";
    exit(1);
}

$bm_order_id = $opts['bm_order_id'];

if (!$conn || mysqli_connect_errno()) {
    error_log("Database connection failed: " . mysqli_connect_error());
    echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . mysqli_connect_error()]);
    exit;
}

// Ensure we use the correct database for orders
if (!mysqli_select_db($conn, 's4d_england_db')) {
    error_log("Failed to select database: " . mysqli_error($conn));
    echo json_encode(['success' => false, 'message' => 'Failed to select database: ' . mysqli_error($conn)]);
    exit;
}

// Debug messages
$debug_messages = "";
function add_debug($message) {
    global $debug_messages;
    $debug_messages .= $message . "\n";
}

error_log("Starting DPD test for bm_order_id: $bm_order_id");

// Fetch required fields from tbl_bm2
add_debug("Fetching required fields from tbl_bm2");
error_log("Fetching required fields from tbl_bm2 for BM Order ID: $bm_order_id");

$result = mysqli_query($conn, "
    SELECT
        first_name, last_name, phone, street, street_2, city, postal_code, email, price
    FROM tbl_bm2
    WHERE bm_order_id = " . intval($bm_order_id) . "
    LIMIT 1
");

if (!$result || mysqli_num_rows($result) === 0) {
    error_log("No record found in tbl_bm2 for bm_order_id: $bm_order_id");
    echo json_encode(['success' => false, 'message' => 'No record found in tbl_bm2 for BM order']);
    exit;
}

$order_data = mysqli_fetch_assoc($result);

// Validate required fields
$required_fields = ['first_name', 'last_name', 'phone', 'street', 'street_2', 'city', 'postal_code', 'email', 'price'];
foreach ($required_fields as $field) {
    if (empty($order_data[$field])) {
        error_log("Warning: {$field} is empty or null for BM Order ID: $bm_order_id");
    }
}

add_debug("Fetched order data from tbl_bm2: " . json_encode($order_data));
error_log("Fetched order data from tbl_bm2 for BM Order ID: $bm_order_id");

// Run bookdpd.php to book shipment
add_debug("Booking DPD shipment");
error_log("Booking DPD shipment for BM Order ID: $bm_order_id");

$bookdpd_path = __DIR__ . '/bookdpd.php';
// Concatenate street and street_2 for the address
$full_street = trim($order_data['street'] . ' ' . $order_data['street_2']);

$command = sprintf(
    "php $bookdpd_path --fn %s --ln %s --ph %s --st %s --city %s --pc %s --em %s --price %s --ref %s --locality %s",
    escapeshellarg($order_data['first_name']),
    escapeshellarg($order_data['last_name']),
    escapeshellarg($order_data['phone']),
    escapeshellarg($full_street),
    escapeshellarg($order_data['city']),
    escapeshellarg($order_data['postal_code']),
    escapeshellarg($order_data['email']),
    escapeshellarg($order_data['price']),
    escapeshellarg($bm_order_id),
    escapeshellarg($order_data['street_2'])
);

error_log("Executing command: $command");
exec($command, $dpd_output, $dpd_exit_code);
$dpd_result_raw = implode("\n", $dpd_output);

error_log("bookdpd.php output: $dpd_result_raw");

if ($dpd_exit_code !== 0) {
    error_log("bookdpd.php failed with exit code {$dpd_exit_code}");
    echo json_encode(['success' => false, 'message' => 'Failed to book DPD shipment', 'debug' => $debug_messages, 'raw_output' => $dpd_result_raw]);
    exit;
}

// Parse bookdpd.php output (JSON)
// Try to parse the entire output as JSON first (improved format)
$dpd_result = json_decode($dpd_result_raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    // Fallback 1: Extract the last JSON object from the output (legacy format)
    $dpd_result = null;
    $lines = explode("\n", $dpd_result_raw);
    for ($i = count($lines) - 1; $i >= 0; $i--) {
        $line = trim($lines[$i]);
        if (!empty($line)) {
            $decoded = json_decode($line, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $dpd_result = $decoded;
                break;
            }
        }
    }

    // Fallback 2: Look for JSON pattern in the raw output (handles concatenated JSON)
    if ($dpd_result === null) {
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
            error_log("Successfully extracted JSON from concatenated output (found " . count($json_objects) . " JSON objects, using last one)");
        }
    }
}

if ($dpd_result === null) {
    error_log("Could not parse bookdpd.php output. Raw output: " . $dpd_result_raw);
    echo json_encode(['success' => false, 'message' => 'Failed to parse DPD booking response', 'debug' => $debug_messages, 'raw_output' => $dpd_result_raw]);
    exit;
}

// Check if this is a successful response (handle both response formats)
$is_success = false;
if (isset($dpd_result['success']) && $dpd_result['success'] === true) {
    // Format 1: Simplified response with success flag
    $is_success = true;
} elseif (isset($dpd_result['data']['consignmentDetail']) && is_array($dpd_result['data']['consignmentDetail'])) {
    // Format 2: Full API response with consignment details
    $is_success = true;
} elseif (isset($dpd_result['collectionDate']) && isset($dpd_result['consignment'])) {
    // Format 3: Booking payload (debugging output) - this indicates the booking was attempted
    $is_success = true;
}

if (!$is_success) {
    error_log("DPD booking failed - unexpected response format");
    echo json_encode(['success' => false, 'message' => 'DPD booking failed - unexpected response format', 'debug' => $debug_messages, 'dpd_result' => $dpd_result]);
    exit;
}

// Extract values based on response format
if (isset($dpd_result['consignment_no']) && isset($dpd_result['parcel_no']) && isset($dpd_result['shipment_id'])) {
    // Format 1: Simplified response
    $consignment_no = $dpd_result['consignment_no'];
    $parcel_no      = $dpd_result['parcel_no'];
    $shipment_id    = $dpd_result['shipment_id'];
} elseif (isset($dpd_result['data']['consignmentDetail'][0]['consignmentNumber']) &&
          isset($dpd_result['data']['consignmentDetail'][0]['parcelNumbers'][0]) &&
          isset($dpd_result['data']['shipmentId'])) {
    // Format 2: Full API response
    $consignment_no = $dpd_result['data']['consignmentDetail'][0]['consignmentNumber'];
    $parcel_no      = $dpd_result['data']['consignmentDetail'][0]['parcelNumbers'][0];
    $shipment_id    = $dpd_result['data']['shipmentId'];
} else {
    error_log("Missing required shipment fields in bookdpd.php output");
    echo json_encode(['success' => false, 'message' => 'Missing required shipment fields in DPD booking response', 'debug' => $debug_messages, 'dpd_result' => $dpd_result]);
    exit;
}

if (!$consignment_no || !$parcel_no || !$shipment_id) {
    error_log("Empty required shipment fields in bookdpd.php output");
    echo json_encode(['success' => false, 'message' => 'Empty required shipment fields in DPD booking response', 'debug' => $debug_messages, 'dpd_result' => $dpd_result]);
    exit;
}

add_debug("Shipment booked - Consignment: $consignment_no, Parcel: $parcel_no, Shipment ID: $shipment_id");
error_log("Shipment booked - Consignment: $consignment_no, Parcel: $parcel_no, Shipment ID: $shipment_id");

// Final response - only the DPD booking part, no Backmarket update
add_debug("DPD booking test completed successfully");
error_log("DPD booking test completed successfully for BM Order ID: $bm_order_id");

echo json_encode([
    'success' => true,
    'consignment_no' => $consignment_no,
    'parcel_no' => $parcel_no,
    'shipment_id' => $shipment_id,
    'message' => 'DPD booking test completed successfully',
    'debug' => $debug_messages,
    'dpd_result' => $dpd_result
], JSON_PRETTY_PRINT) . "\n";
?>