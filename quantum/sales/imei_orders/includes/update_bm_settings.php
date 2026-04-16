<?php
// Use project root db_config.php (three levels up from this file)
include dirname(__DIR__, 3) . '/db_config.php';
require_once __DIR__ . '/dpd_printer_helper.php';

header('Content-Type: application/json');

if (!$conn || mysqli_connect_errno()) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

$cutoff = isset($_POST['collection_cutoff']) ? trim($_POST['collection_cutoff']) : '';
$dpdPrinter = isset($_POST['dpd_printer_endpoint']) ? trim($_POST['dpd_printer_endpoint']) : null;
$deliveryNotePrinter = isset($_POST['delivery_note_printer_endpoint']) ? trim($_POST['delivery_note_printer_endpoint']) : null;

// Validate HH:MM 24-hour format
if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $cutoff)) {
    echo json_encode(['success' => false, 'message' => 'Invalid time format']);
    exit;
}

// Validate and store DPD printer selection (session only)
if ($dpdPrinter !== null && $dpdPrinter !== '') {
    $options = getDpdPrinterOptions();
    if (!array_key_exists($dpdPrinter, $options)) {
        echo json_encode(['success' => false, 'message' => 'Invalid DPD printer selection']);
        exit;
    }
    $dpdPrinter = resolveDpdPrinter($dpdPrinter);
} else {
    $dpdPrinter = resolveDpdPrinter();
}

// Validate and store delivery note printer selection (session only)
if ($deliveryNotePrinter !== null && $deliveryNotePrinter !== '') {
    $options = getBmDeliveryNotePrinterOptions();
    if (!array_key_exists($deliveryNotePrinter, $options)) {
        echo json_encode(['success' => false, 'message' => 'Invalid delivery note printer selection']);
        exit;
    }
    $deliveryNotePrinter = resolveBmDeliveryNotePrinter($deliveryNotePrinter);
} else {
    $deliveryNotePrinter = resolveBmDeliveryNotePrinter();
}

// Ensure column exists; if not, create it
$exists = mysqli_query($conn, "SHOW COLUMNS FROM tbl_settings LIKE 'bm_collection_cutoff'");
if ($exists && mysqli_num_rows($exists) === 0) {
    if (!mysqli_query($conn, "ALTER TABLE tbl_settings ADD COLUMN bm_collection_cutoff VARCHAR(5) DEFAULT '13:30'")) {
        echo json_encode(['success' => false, 'message' => 'Failed to update schema']);
        exit;
    }
}

// Update value (single-row settings table)
$ok = mysqli_query($conn, "UPDATE tbl_settings SET bm_collection_cutoff='" . mysqli_real_escape_string($conn, $cutoff) . "'");

if ($ok) {
    echo json_encode([
        'success' => true,
        'collection_cutoff' => $cutoff,
        'dpd_printer_endpoint' => $dpdPrinter,
        'delivery_note_printer_endpoint' => $deliveryNotePrinter,
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to save setting']);
}
exit;
