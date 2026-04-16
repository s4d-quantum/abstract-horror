<?php include '../../../db_config.php'; ?>

<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$customer      = $_POST['customer'];
$supplier      = $_POST['supplier'];
$po_ref        = $_POST['po_ref'];
$customer_ref  = $_POST['customer_ref'];
$user_id       = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : (int)($_POST['user_id'] ?? 0);
$date          = date('Y-m-d');

if ($user_id <= 0) {
    echo json_encode(['success' => false, 'error' => 'Missing user session']);
    exit;
}

// --- NEW ORDER ID ---
$imei_orders = mysqli_query($conn, "SELECT MAX(order_id) AS oid FROM tbl_imei_sales_orders")
    or die('Error:: ' . mysqli_error($conn));

$order = mysqli_fetch_assoc($imei_orders);
$new_ord_id = ($order['oid'] + 1);

// --- SANITY CHECK: ALL ARRAYS MUST MATCH LENGTH ---
$item_count = count($_POST['item_code']);

$fields = [
    'item_code',
    'item_color',
    'item_brand',
    'item_details',
    'item_gb',
    'item_grade',
    'tray_id',
    'supplier'
];

foreach ($fields as $f) {
    if (!isset($_POST[$f]) || count($_POST[$f]) != $item_count) {
        echo json_encode([
            'success' => false,
            'error'   => "Mismatched field count: $f"
        ]);
        exit;
    }
}

// --- DUPLICATE CHECK ---
$errors = [];

for ($i = 0; $i < $item_count; $i++) {
    $imei = $_POST['item_code'][$i];

    $dup = mysqli_query(
        $conn,
        "SELECT id FROM tbl_imei_sales_orders 
         WHERE item_code = '$imei' AND is_completed = 0"
    );

    if (mysqli_num_rows($dup) > 0) {
        $errors[] = "Duplicate IMEI detected: $imei";
    }

    // --- STOCK STATUS CHECK ---
    $stock_check = mysqli_query($conn, 
        "SELECT status FROM tbl_imei WHERE item_imei = '$imei'"
    );
    $stock_row = mysqli_fetch_assoc($stock_check);

    if (!$stock_row) {
         $errors[] = "IMEI not found in system: $imei";
    } elseif ($stock_row['status'] != 1) {
         $errors[] = "IMEI not in stock (Status " . $stock_row['status'] . "): $imei";
    }
}

if (!empty($errors)) {
    echo json_encode(['success' => false, 'errors' => $errors]);
    exit;
}

// --- INSERT RECORDS (CORRECT LOOP OVER IMEIS) ---
for ($i = 0; $i < $item_count; $i++) {

    $q = mysqli_query(
        $conn,
        "INSERT INTO tbl_imei_sales_orders (
            order_id,
            date,
            po_ref,
            customer_ref,
            customer_id,
            supplier_id,
            user_id,
            item_color,
            item_brand,
            item_details,
            item_gb,
            item_grade,
            tray_id,
            item_code,
            is_completed
        ) VALUES (
            '$new_ord_id',
            '$date',
            '$po_ref',
            '$customer_ref',
            '$customer',
            '{$supplier[$i]}',
            '$user_id',
            '{$_POST['item_color'][$i]}',
            '{$_POST['item_brand'][$i]}',
            '{$_POST['item_details'][$i]}',
            '{$_POST['item_gb'][$i]}',
            '{$_POST['item_grade'][$i]}',
            '{$_POST['tray_id'][$i]}',
            '{$_POST['item_code'][$i]}',
            0
        )"
    ) or die('Error:: ' . mysqli_error($conn));

    // --- LOG ---
    mysqli_query(
        $conn,
        "INSERT INTO tbl_log (
            ref,
            subject,
            details,
            date,
            user_id,
            item_code
        ) VALUES (
            'SO-$new_ord_id',
            'NEW SALES ORDER',
            'QTY:1',
            '$date',
            '$user_id',
            '{$_POST['item_code'][$i]}'
        )"
    ) or die('Error:: ' . mysqli_error($conn));
}

echo json_encode(['success' => true, 'order_id' => $new_ord_id]);
