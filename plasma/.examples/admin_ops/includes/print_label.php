<?php
include '../../../db_config.php';
include "../../../authenticate.php";
require_once 'label_helper.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
    exit;
}

$imei = isset($_POST['imei']) ? trim($_POST['imei']) : '';
$mode = isset($_POST['mode']) ? trim($_POST['mode']) : 'cloud';

if ($imei === '') {
    echo json_encode([
        'success' => false,
        'message' => 'IMEI is required.'
    ]);
    exit;
}

// Validate IMEI format (basic check - 14-17 digits for flexibility)
if (!preg_match('/^\d{14,17}$/', $imei)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid IMEI format. Must be 14-17 digits.'
    ]);
    exit;
}

// Ensure we're using s4d_england_db database
// Check current database first
$currentDbResult = mysqli_query($conn, "SELECT DATABASE()");
if ($currentDbResult) {
    $currentDbRow = mysqli_fetch_row($currentDbResult);
    $currentDb = $currentDbRow[0];
    mysqli_free_result($currentDbResult);

    // Only switch if we're not already on s4d_england_db
    if ($currentDb !== 's4d_england_db') {
        if (!mysqli_select_db($conn, 's4d_england_db')) {
            echo json_encode([
                'success' => false,
                'message' => 'Database selection failed: ' . mysqli_error($conn)
            ]);
            exit;
        }
    }
}

// Lookup device info
$deviceData = lookupDeviceInfo($conn, $imei);

if (!$deviceData) {
    // Get current database for debugging
    $dbCheckResult = mysqli_query($conn, "SELECT DATABASE()");
    $currentDatabase = 'unknown';
    if ($dbCheckResult) {
        $dbRow = mysqli_fetch_row($dbCheckResult);
        $currentDatabase = $dbRow[0];
        mysqli_free_result($dbCheckResult);
    }

    // Try to check if view exists
    $viewCheckResult = mysqli_query($conn, "SHOW TABLES LIKE 'v_imei_lookup'");
    $viewExists = false;
    if ($viewCheckResult) {
        $viewExists = mysqli_num_rows($viewCheckResult) > 0;
        mysqli_free_result($viewCheckResult);
    }

    echo json_encode([
        'success' => false,
        'message' => 'IMEI not found in database.',
        'debug' => [
            'imei' => $imei,
            'current_db' => $currentDatabase,
            'view_exists' => $viewExists
        ]
    ]);
    exit;
}

// Check if required fields are present
if (empty($deviceData['brand_name']) || empty($deviceData['model_name'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Incomplete device data in database.'
    ]);
    exit;
}

// Generate ZPL
$zpl = generateZPL(
    $deviceData['brand_name'],
    $deviceData['model_name'],
    $deviceData['item_gb'] ?? '0',
    $deviceData['item_color'] ?? 'Unknown',
    $deviceData['grade_title'] ?? 'N/A',
    $imei
);

// Print label
$printResult = printLabel($zpl, $mode);

if ($printResult['success']) {
    echo json_encode([
        'success' => true,
        'message' => 'Label printed successfully',
        'imei' => $imei,
        'device_info' => formatDeviceInfo($deviceData)
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => $printResult['message']
    ]);
}
