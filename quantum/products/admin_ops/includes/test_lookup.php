<?php
include '../../../db_config.php';
include "../../../authenticate.php";
require_once 'label_helper.php';

header('Content-Type: application/json');

$imei = isset($_GET['imei']) ? trim($_GET['imei']) : '350048581334781';

// Get current database
$currentDbResult = mysqli_query($conn, "SELECT DATABASE()");
$currentDbRow = mysqli_fetch_row($currentDbResult);
$currentDb = $currentDbRow[0];

echo json_encode([
    'current_db_before' => $currentDb,
    'connection_info' => mysqli_get_host_info($conn)
]);

// Switch to s4d_england_db
$switchResult = mysqli_select_db($conn, 's4d_england_db');

if (!$switchResult) {
    echo json_encode([
        'error' => 'Failed to switch database',
        'mysql_error' => mysqli_error($conn)
    ]);
    exit;
}

// Get current database after switch
$currentDbResult = mysqli_query($conn, "SELECT DATABASE()");
$currentDbRow = mysqli_fetch_row($currentDbResult);
$currentDb = $currentDbRow[0];

echo json_encode([
    'current_db_after' => $currentDb
]);

// Test the view directly
$sql = "SELECT * FROM v_imei_lookup WHERE item_imei = '" . mysqli_real_escape_string($conn, $imei) . "'";
echo json_encode([
    'sql' => $sql
]);

$result = mysqli_query($conn, $sql);

if (!$result) {
    echo json_encode([
        'error' => 'Query failed',
        'mysql_error' => mysqli_error($conn)
    ]);
    exit;
}

$data = mysqli_fetch_assoc($result);

echo json_encode([
    'success' => true,
    'imei' => $imei,
    'found' => $data ? true : false,
    'data' => $data,
    'num_rows' => mysqli_num_rows($result)
], JSON_PRETTY_PRINT);
