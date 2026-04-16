<?php
include dirname(__DIR__, 3) . '/db_config.php';

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

// Determine if this request should only handle the DPD booking portion
$dpd_only = false;
if (isset($_POST['dpd_only'])) {
    $dpd_flag = $_POST['dpd_only'];
    $dpd_only = $dpd_flag === true || $dpd_flag === 'true' || $dpd_flag === 1 || $dpd_flag === '1';
}

// Debug messages
$debug_messages = "";
function add_debug($message) {
    global $debug_messages;
    $debug_messages .= $message . "\n";
}

// Add columns if not exist to tbl_bm2
$columns_to_add = [
    'consignment_no' => 'VARCHAR(50)',
    'parcel_no' => 'VARCHAR(50)',
    'shipment_id' => 'VARCHAR(50)',
    'price' => 'DECIMAL(10,2) DEFAULT 0.00',
    'street_2' => 'VARCHAR(255)',
    'country' => 'VARCHAR(10)'
];
foreach ($columns_to_add as $col => $type) {
    $check_col_stmt = mysqli_prepare($conn, "SHOW COLUMNS FROM tbl_bm2 LIKE ?");
    mysqli_stmt_bind_param($check_col_stmt, "s", $col);
    mysqli_stmt_execute($check_col_stmt);
    $check_col = mysqli_stmt_get_result($check_col_stmt);
    if (mysqli_num_rows($check_col) == 0) {
        $alter_query = "ALTER TABLE tbl_bm2 ADD COLUMN `$col` $type";
        if (mysqli_query($conn, $alter_query)) {
            error_log("Added column $col to tbl_bm2");
        } else {
            error_log("Failed to add column $col to tbl_bm2: " . mysqli_error($conn));
        }
    }
    mysqli_stmt_close($check_col_stmt);
}

error_log("Starting BM order processing for sales_order_id");

// Check if sales order ID is provided
if (!isset($_POST['po_ref']) || empty($_POST['po_ref'])) {
    // Also check if it's coming from the order details page
    if (!isset($_POST['po_reference']) || empty($_POST['po_reference'])) {
        echo json_encode(['success' => false, 'message' => 'Sales order ID is required']);
        exit;
    }
    $sales_order_id = $_POST['po_reference'];
} else {
    $sales_order_id = $_POST['po_ref'];
}

add_debug("Received sales_order_id: $sales_order_id");
error_log("Received sales_order_id: $sales_order_id");

// Debug: Check all POST data
add_debug("All POST data: " . json_encode($_POST));
error_log("POST data: " . json_encode($_POST));

// Get order details from database using sales order ID
$fetch_order_stmt = mysqli_prepare($conn, "SELECT * FROM tbl_imei_sales_orders WHERE order_id = ? LIMIT 1");
mysqli_stmt_bind_param($fetch_order_stmt, "s", $sales_order_id);
mysqli_stmt_execute($fetch_order_stmt);
$fetch_order_query = mysqli_stmt_get_result($fetch_order_stmt);
if (!$fetch_order_query) {
    add_debug("Query failed: " . mysqli_error($conn));
    error_log("Fetch order query failed: " . mysqli_error($conn));
    echo json_encode(['success' => false, 'message' => 'Database query failed', 'debug' => $debug_messages]);
    exit;
}

if (mysqli_num_rows($fetch_order_query) == 0) {
    add_debug("No rows found for order_id = '$sales_order_id'");
    // Try alternative query with different field
    $alt_stmt = mysqli_prepare($conn, "SELECT * FROM tbl_imei_sales_orders WHERE po_ref = ? LIMIT 1");
    mysqli_stmt_bind_param($alt_stmt, "s", $sales_order_id);
    mysqli_stmt_execute($alt_stmt);
    $alt_query = mysqli_stmt_get_result($alt_stmt);
    if ($alt_query && mysqli_num_rows($alt_query) > 0) {
        add_debug("Found order using po_ref instead of order_id");
        $fetch_order_query = $alt_query;
    } else {
        error_log("Order not found for sales_order_id: $sales_order_id");
        echo json_encode(['success' => false, 'message' => 'Order not found for the provided sales order ID', 'debug' => $debug_messages]);
        exit;
    }
    mysqli_stmt_close($alt_stmt);
}

$order_data = mysqli_fetch_assoc($fetch_order_query);
$po_ref = $order_data['po_ref']; // This is the BackMarket order ID
$item_code = $order_data['item_code']; // This is the IMEI

add_debug("Stage 1: Get BM order ID - Sales Order ID: $sales_order_id, BM Order ID: $po_ref, IMEI: $item_code");
error_log("BM Order ID: $po_ref, IMEI: $item_code");

// Check if the order is for Backmarket (customer_id should be CST-78)
if ($order_data['customer_id'] != 'CST-78') {
    error_log("Order not for Backmarket: customer_id = " . $order_data['customer_id']);
    echo json_encode(['success' => false, 'message' => 'This feature is only available for Backmarket orders.']);
    exit;
}

// Check if the order is completed
// Temporarily disabled for testing
/*
if ($order_data['is_completed'] != 1) {
    error_log("Order not completed: is_completed = " . $order_data['is_completed']);
    echo json_encode(['success' => false, 'message' => 'Order is not yet completed. Please complete the order first.']);
    exit;
}
*/

// -------------------------------
// STEP 1: Run bm_info.php to fetch & store BM data
// -------------------------------
add_debug("Stage 2: Running bm_info.php to fetch order data");
error_log("Running bm_info.php to fetch order data for BM Order ID: $po_ref");

$bm_info_path = __DIR__ . '/bm_info.php';
$command = "php $bm_info_path " . escapeshellarg($po_ref);
error_log("Executing command: $command");

// Execute bm_info.php
$output = shell_exec($command . ' 2>&1');
error_log("bm_info.php output: $output");

// Check if bm_info.php executed successfully
if (strpos($output, 'processed successfully') === false) {
    error_log("Failed to execute bm_info.php successfully");
    echo json_encode(['success' => false, 'message' => 'Failed to fetch BackMarket order data', 'debug' => $debug_messages]);
    exit;
}

add_debug("bm_info.php completed successfully");
error_log("bm_info.php completed successfully for BM Order ID: $po_ref");

// -------------------------------
// STEP 2.5: Validate address using Ideal Postcodes API
// -------------------------------
add_debug("Stage 2.5: Validating address using Ideal Postcodes API");
error_log("Starting address validation for BM Order ID: $po_ref");

// Include validation service
require_once __DIR__ . '/validate_address_service.php';

// Create validation service instance with error handling
try {
    $validation_service = new AddressValidationService($conn, true); // Enable debug mode
    add_debug("Address validation service initialized successfully");
} catch (Exception $e) {
    add_debug("Failed to initialize address validation service: " . $e->getMessage());
    error_log("Failed to initialize AddressValidationService for BM Order ID: $po_ref - Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Address validation service initialization failed',
        'details' => 'Please contact system administrator',
        'debug' => $debug_messages
    ]);
    exit;
}

// Perform address validation with enhanced error handling
$validation_result = $validation_service->validateOrderAddressWithErrorHandling($po_ref);

// Handle validation results
if (!$validation_result['success']) {
    $error_type = $validation_result['error_type'] ?? 'validation_failed';
    $error_message = $validation_result['message'] ?? 'Address validation failed';
    $error_details = $validation_result['details'] ?? '';
    
    // Add validation debug messages to main debug output
    if (isset($validation_result['debug'])) {
        add_debug("Validation Debug: " . $validation_result['debug']);
    }
    
    // Log validation failure
    error_log("Address validation failed for BM Order ID: $po_ref - Type: $error_type, Message: $error_message");
    
    // Handle different error types appropriately
    switch ($error_type) {
        case 'manual_review_required':
            // For manual review cases, provide detailed information
            $review_reason = $validation_result['reason'] ?? 'unknown';
            $guidance = $validation_result['guidance'] ?? 'Please review address manually';
            
            echo json_encode([
                'success' => false,
                'message' => 'Address validation requires manual review',
                'error_type' => 'manual_review_required',
                'reason' => $review_reason,
                'guidance' => $guidance,
                'validation_details' => $validation_result['validation_details'] ?? [],
                'manual_review_url' => 'address_manual_review.php?order_id=' . urlencode($po_ref),
                'debug' => $debug_messages
            ]);
            exit;
            
        case 'northern_ireland_manual_required':
        case 'offshore_manual_required':
            // For non-mainland UK addresses
            echo json_encode([
                'success' => false,
                'message' => $validation_result['message'],
                'error_type' => $validation_result['error_type'],
                'details' => $validation_result['details'],
                'guidance' => $validation_result['guidance'],
                'debug' => $debug_messages
            ]);
            exit;
            
        case 'address_suggestions_available':
            // For addresses with suggestions available
            $_SESSION['validation_error_' . $po_ref] = $validation_result;
            
            echo json_encode([
                'success' => false,
                'message' => $validation_result['message'],
                'error_type' => 'address_suggestions_available',
                'details' => $validation_result['details'],
                'suggestions_count' => count($validation_result['suggestions'] ?? []),
                'manual_review_url' => 'address_manual_review.php?order_id=' . urlencode($po_ref),
                'guidance' => 'Similar addresses found. Please review and select the correct address.',
                'debug' => $debug_messages
            ]);
            exit;
            
        case 'configuration_error':
        case 'authentication_error':
            // Configuration issues should be handled by admin
            echo json_encode([
                'success' => false,
                'message' => 'Address validation service configuration error',
                'details' => 'Please contact system administrator',
                'debug' => $debug_messages
            ]);
            exit;
            
        case 'rate_limit_exceeded':
            // Rate limit - suggest retry
            $retry_after = $validation_result['retry_after'] ?? 300;
            echo json_encode([
                'success' => false,
                'message' => 'Address validation service temporarily unavailable',
                'details' => "Rate limit exceeded. Please try again in " . ($retry_after / 60) . " minutes.",
                'retry_after' => $retry_after,
                'debug' => $debug_messages
            ]);
            exit;
            
        case 'api_server_error':
            // API server issues
            echo json_encode([
                'success' => false,
                'message' => 'Address validation service temporarily unavailable',
                'details' => 'The validation service is experiencing technical difficulties. Please try again later.',
                'debug' => $debug_messages
            ]);
            exit;
            
        default:
            // Generic validation failure
            echo json_encode([
                'success' => false,
                'message' => $error_message,
                'details' => $error_details,
                'debug' => $debug_messages
            ]);
            exit;
    }
}

// Add validation success debug messages
if (isset($validation_result['debug'])) {
    add_debug("Validation Debug: " . $validation_result['debug']);
}

// Log validation success details
$validation_data = $validation_result['validation_result'] ?? [];
$confidence_score = $validation_data['confidence_score'] ?? 'unknown';
$match_level = $validation_data['match_level'] ?? 'unknown';
$corrections_made = $validation_data['corrections_made'] ?? [];

add_debug("Address validation completed successfully - Confidence: $confidence_score, Match Level: $match_level");
if (!empty($corrections_made)) {
    add_debug("Address corrections made: " . implode(', ', $corrections_made));
}

error_log("Address validation completed successfully for BM Order ID: $po_ref - Confidence: $confidence_score, Match Level: $match_level");

// -------------------------------
// STEP 3: Fetch required fields from tbl_bm2 (now with validated address data)
// -------------------------------
add_debug("Stage 3: Fetching address data (preferring validated addresses)");
error_log("Fetching address data (preferring validated addresses) for BM Order ID: $po_ref");

// Use validation service to get the best available address data for DPD booking
$address_result = $validation_service->getValidatedAddressForDPD($po_ref);

if (!$address_result['success']) {
    $error_type = $address_result['error_type'] ?? 'address_retrieval_failed';
    $error_message = $address_result['message'] ?? 'Failed to retrieve address data';
    $error_details = $address_result['details'] ?? '';
    
    add_debug("Address retrieval failed: $error_message");
    error_log("Failed to retrieve address data for DPD booking - BM Order ID: $po_ref, Error: $error_message");
    
    echo json_encode([
        'success' => false, 
        'message' => 'Failed to retrieve address data for DPD booking',
        'error_type' => $error_type,
        'details' => $error_details,
        'debug' => $debug_messages
    ]);
    exit;
}

$order_data = $address_result['address_data'];
$validation_info = $address_result['validation_info'] ?? ['is_validated' => false];

// Log whether we're using validated or original address data
if ($validation_info['is_validated']) {
    add_debug("Using validated address data for DPD booking (confidence: " . $validation_info['confidence_score'] . ")");
    error_log("Using validated address data for DPD booking - BM Order ID: $po_ref, Confidence: " . $validation_info['confidence_score']);
} else {
    add_debug("Using original address data for DPD booking (no validation available)");
    error_log("Using original address data for DPD booking - BM Order ID: $po_ref");
}

// Ensure we still have the price field for DPD booking
if (!isset($order_data['price'])) {
    // Fetch price separately if not included in validated address data
    $price_result = mysqli_query($conn, "SELECT price FROM tbl_bm2 WHERE bm_order_id = " . intval($po_ref) . " LIMIT 1");
    if ($price_result && mysqli_num_rows($price_result) > 0) {
        $price_row = mysqli_fetch_assoc($price_result);
        $order_data['price'] = $price_row['price'];
    } else {
        $order_data['price'] = '0.00'; // Default fallback
    }
}

// Offshore postal code validation check - if postal code starts with BT, JY, IM, or GY, show error and stop processing
if (isset($order_data['postal_code']) && !empty($order_data['postal_code'])) {
    $postal_code_prefix = strtoupper(substr($order_data['postal_code'], 0, 2));
    $offshore_prefixes = ['BT', 'JY', 'IM', 'GY']; // Northern Ireland, Jersey, Isle of Man, Guernsey
    
    if (in_array($postal_code_prefix, $offshore_prefixes)) {
        error_log("Offshore shipment detected for BM Order ID: $po_ref, postal code: " . $order_data['postal_code']);
        echo json_encode([
            'success' => false,
            'message' => 'Offshore Shipment. Please manually book and update DPD.',
            'debug' => $debug_messages
        ]);
        exit;
    }
}

// Country validation check - if country is not GB, show error and stop processing
if (isset($order_data['country']) && $order_data['country'] !== 'GB') {
    error_log("Non UK order detected for BM Order ID: $po_ref, country: " . $order_data['country']);
    echo json_encode([
        'success' => false,
        'message' => 'Non UK order, Please book shipping and update backmarket manually',
        'debug' => $debug_messages
    ]);
    exit;
}

// If country field is missing entirely, we should also treat it as non-UK for safety
if (!isset($order_data['country']) || $order_data['country'] === null || $order_data['country'] === '') {
    error_log("Country field missing or empty for BM Order ID: $po_ref");
    echo json_encode([
        'success' => false,
        'message' => 'Non UK order, Please book shipping and update backmarket manually',
        'debug' => $debug_messages
    ]);
    exit;
}

// Validate required fields (excluding country which is used for validation check)
$required_fields = ['first_name', 'last_name', 'phone', 'street', 'street_2', 'city', 'postal_code', 'email', 'price'];
foreach ($required_fields as $field) {
    if (empty($order_data[$field])) {
        error_log("Warning: {$field} is empty or null for BM Order ID: $po_ref");
    }
}

add_debug("Fetched order data from tbl_bm2: " . json_encode($order_data));
error_log("Fetched order data from tbl_bm2 for BM Order ID: $po_ref");

// -------------------------------
// STEP 4: Run bookdpd.php to book shipment (using validated address data)
// -------------------------------
add_debug("Stage 4: Booking DPD shipment using validated address data");
error_log("Booking DPD shipment for BM Order ID: $po_ref");

$bookdpd_path = __DIR__ . '/bookdpd.php';

// Handle address formatting based on whether we have validated address data
if ($validation_info['is_validated'] && isset($address_result['validated_components'])) {
    // Use validated address components formatted for DPD
    $validated_components = $address_result['validated_components'];
    $full_street = $validated_components['formatted_street'] ?? trim($order_data['street'] . ' ' . ($order_data['street_2'] ?? ''));
    
    // Ensure we have all required fields, using validated data where available
    $order_data['street'] = $validated_components['street'] ?? $order_data['street'];
    $order_data['street_2'] = $validated_components['street_2'] ?? ($order_data['street_2'] ?? '');
    $order_data['city'] = $validated_components['city'] ?? $order_data['city'];
    $order_data['postal_code'] = $validated_components['postal_code'] ?? $order_data['postal_code'];
    
    add_debug("Using validated address components for DPD booking");
} else {
    // Use original address format
    $full_street = trim($order_data['street'] . ' ' . ($order_data['street_2'] ?? ''));
    add_debug("Using original address format for DPD booking");
}

// Fetch BM collection cut-off time from settings (fallback to 13:30)
$bm_cutoff = '13:30';
// Try to read from tbl_settings if column exists
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

$command = sprintf(
    "php $bookdpd_path --fn %s --ln %s --ph %s --st %s --city %s --pc %s --em %s --price %s --ref %s --locality %s --cutoff %s",
    escapeshellarg($order_data['first_name'] ?? ''),
    escapeshellarg($order_data['last_name'] ?? ''),
    escapeshellarg($order_data['phone'] ?? ''),
    escapeshellarg($full_street),
    escapeshellarg($order_data['city'] ?? ''),
    escapeshellarg($order_data['postal_code'] ?? ''),
    escapeshellarg($order_data['email'] ?? ''),
    escapeshellarg($order_data['price'] ?? '0.00'),
    escapeshellarg($po_ref),
    escapeshellarg($order_data['street_2'] ?? ''),
    escapeshellarg($bm_cutoff)
);

error_log("Executing command: $command");
exec($command, $dpd_output, $dpd_exit_code);
$dpd_result_raw = implode("\n", $dpd_output);

error_log("bookdpd.php output: $dpd_result_raw");

if ($dpd_exit_code !== 0) {
    error_log("bookdpd.php failed with exit code {$dpd_exit_code}");
    echo json_encode(['success' => false, 'message' => 'Failed to book DPD shipment', 'debug' => $debug_messages]);
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
    error_log("DPD booking failed - unexpected response format. Raw output: " . $dpd_result_raw);
    echo json_encode(['success' => false, 'message' => 'DPD booking failed - unexpected response format', 'debug' => $debug_messages, 'raw_output' => $dpd_result_raw]);
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
    echo json_encode(['success' => false, 'message' => 'Missing required shipment fields in DPD booking response', 'debug' => $debug_messages]);
    exit;
}

if (!$consignment_no || !$parcel_no || !$shipment_id) {
    error_log("Empty required shipment fields in bookdpd.php output");
    echo json_encode(['success' => false, 'message' => 'Empty required shipment fields in DPD booking response', 'debug' => $debug_messages]);
    exit;
}

add_debug("Shipment booked - Consignment: $consignment_no, Parcel: $parcel_no, Shipment ID: $shipment_id");
error_log("Shipment booked - Consignment: $consignment_no, Parcel: $parcel_no, Shipment ID: $shipment_id");

// -------------------------------
// STEP 5: Update tbl_bm2 with shipment info
// -------------------------------
add_debug("Stage 5: Updating tbl_bm2 with shipment info");
error_log("Updating tbl_bm2 with shipment info for BM Order ID: $po_ref");

$sql = "
    UPDATE tbl_bm2 SET
        consignment_no = '" . mysqli_real_escape_string($conn, $consignment_no) . "',
        parcel_no = '" . mysqli_real_escape_string($conn, $parcel_no) . "',
        shipment_id = '" . mysqli_real_escape_string($conn, $shipment_id) . "'
    WHERE bm_order_id = " . intval($po_ref) . "
";

if (!mysqli_query($conn, $sql)) {
    error_log("Failed to update tbl_bm2: " . mysqli_error($conn));
    echo json_encode(['success' => false, 'message' => 'Failed to update shipment information in database', 'debug' => $debug_messages]);
    exit;
}

add_debug("tbl_bm2 updated with shipment info");
error_log("tbl_bm2 updated with shipment info for BM Order ID: $po_ref");

// -------------------------------
// STEP 6: Run update_bm.php to push IMEI + tracking to BackMarket
// -------------------------------
if (!$dpd_only) {
    add_debug("Stage 6: Running update_bm.php to update BackMarket");
    error_log("Running update_bm.php to update BackMarket for BM Order ID: $po_ref");

    $update_bm_path = __DIR__ . '/update_bm.php';
    $command = sprintf(
        "php $update_bm_path -oid %s -imei %s -tr %s",
        escapeshellarg($po_ref),
        escapeshellarg($item_code),
        escapeshellarg($consignment_no)
    );

    error_log("Executing command: $command");
    exec($command, $update_output, $update_exit_code);
    $update_result_raw = implode("\n", $update_output);

    error_log("update_bm.php output: $update_result_raw");

    if ($update_exit_code !== 0) {
        error_log("update_bm.php failed with exit code {$update_exit_code}");
        echo json_encode(['success' => false, 'message' => 'Failed to update BackMarket order', 'debug' => $debug_messages]);
        exit;
    }

    add_debug("update_bm.php completed successfully");
    error_log("update_bm.php completed successfully for BM Order ID: $po_ref");
} else {
    add_debug("Stage 6 skipped - dpd_only flag enabled");
    error_log("Skipping update_bm.php for BM Order ID: $po_ref (dpd_only request)");
}

// -------------------------------
// Final response
// -------------------------------
add_debug("Stage 7: Process completed successfully");
error_log("Process completed successfully for Sales Order ID: $sales_order_id, BM Order ID: $po_ref");

// Include validation information in final response
$response_data = [
    'success' => true,
    'tracking_number' => $consignment_no,
    'consignment_no' => $consignment_no,
    'message' => $dpd_only
        ? 'DPD booking completed successfully. Please run Update BM from the order details page.'
        : 'DPD booking completed and BackMarket order updated successfully',
    'dpd_only' => $dpd_only,
    'debug' => $debug_messages
];

// Add validation information if available
if (isset($validation_info) && $validation_info['is_validated']) {
    $response_data['validation_info'] = [
        'address_validated' => true,
        'confidence_score' => $validation_info['confidence_score'] ?? 'unknown',
        'match_level' => $validation_info['match_level'] ?? 'unknown'
    ];
    add_debug("Final response includes validation info - validated address used");
} else {
    $response_data['validation_info'] = [
        'address_validated' => false,
        'note' => 'Original address used (no validation available)'
    ];
    add_debug("Final response - original address used (no validation)");
}

echo json_encode($response_data);
?>
