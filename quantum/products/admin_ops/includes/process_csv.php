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

$mode = isset($_POST['mode']) ? trim($_POST['mode']) : 'cloud';
$requestedEndpoint = isset($_POST['endpoint']) ? trim($_POST['endpoint']) : null;
$availableEndpoints = getAvailablePrintEndpoints();

if ($requestedEndpoint && !array_key_exists($requestedEndpoint, $availableEndpoints)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid printer selection.'
    ]);
    exit;
}

$selectedEndpoint = resolvePrintEndpoint($requestedEndpoint);

// Check if file was uploaded
if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode([
        'success' => false,
        'message' => 'No file uploaded or upload error occurred.'
    ]);
    exit;
}

$file = $_FILES['csv_file'];

// Check file extension
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($fileExt !== 'csv') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid file type. Only CSV files are allowed.'
    ]);
    exit;
}

// Read CSV file
$handle = fopen($file['tmp_name'], 'r');
if (!$handle) {
    echo json_encode([
        'success' => false,
        'message' => 'Unable to read CSV file.'
    ]);
    exit;
}

// Switch to s4d_england_db for device lookup
mysqli_select_db($conn, 's4d_england_db');

$imeiList = [];
$lineNumber = 0;

// Parse CSV and extract IMEIs
while (($data = fgetcsv($handle, 1000, ',')) !== false) {
    $lineNumber++;

    // Skip empty lines
    if (empty($data) || (count($data) === 1 && trim($data[0]) === '')) {
        continue;
    }

    // Get first column as IMEI
    $imei = trim($data[0]);

    // Validate IMEI
    if (preg_match('/^\d{15}$/', $imei)) {
        $imeiList[] = $imei;
    }
}

fclose($handle);

if (empty($imeiList)) {
    echo json_encode([
        'success' => false,
        'message' => 'No valid IMEI numbers found in CSV file.'
    ]);
    exit;
}

// Process each IMEI and print labels
$printed = 0;
$failed = 0;
$errors = [];

foreach ($imeiList as $imei) {
    // Lookup device info
    $deviceData = lookupDeviceInfo($conn, $imei);

    if (!$deviceData) {
        $failed++;
        $errors[] = "IMEI {$imei}: Not found in database";
        continue;
    }

    if (empty($deviceData['brand_name']) || empty($deviceData['model_name'])) {
        $failed++;
        $errors[] = "IMEI {$imei}: Incomplete device data";
        continue;
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
    $printResult = printLabel($zpl, $mode, $selectedEndpoint);

    if ($printResult['success']) {
        $printed++;
    } else {
        $failed++;
        $errors[] = "IMEI {$imei}: " . $printResult['message'];
    }

    // Small delay to avoid overwhelming the printer
    usleep(100000); // 100ms
}

echo json_encode([
    'success' => true,
    'message' => "Processed {$printed} labels successfully, {$failed} failed.",
    'printed' => $printed,
    'failed' => $failed,
    'errors' => $errors
]);
