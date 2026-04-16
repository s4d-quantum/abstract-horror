<?php
// Use project root db_config.php (three levels up from this file)
include dirname(__DIR__, 3) . '/db_config.php';
require_once __DIR__ . '/dpd_printer_helper.php';

header('Content-Type: application/json');

if (!$conn || mysqli_connect_errno()) {
    echo json_encode(['success' => false, 'message' => 'DB connection failed']);
    exit;
}

// Ensure column exists; if not, create it with default '13:30'
$exists = mysqli_query($conn, "SHOW COLUMNS FROM tbl_settings LIKE 'bm_collection_cutoff'");
if ($exists && mysqli_num_rows($exists) === 0) {
    @mysqli_query($conn, "ALTER TABLE tbl_settings ADD COLUMN bm_collection_cutoff VARCHAR(5) DEFAULT '13:30'");
}

$cutoff = '13:30';
$res = mysqli_query($conn, "SELECT bm_collection_cutoff AS cutoff FROM tbl_settings LIMIT 1");
if ($res) {
    $row = mysqli_fetch_assoc($res);
    if (!empty($row['cutoff'])) {
        $cutoff = $row['cutoff'];
    }
}

echo json_encode([
    'success' => true,
    'collection_cutoff' => $cutoff,
    'dpd_printer_endpoint' => resolveDpdPrinter(),
    'delivery_note_printer_endpoint' => resolveBmDeliveryNotePrinter(),
]);
exit;
