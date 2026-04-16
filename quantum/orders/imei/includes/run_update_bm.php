<?php
header('Content-Type: application/json');

include dirname(__DIR__, 3) . '/db_config.php';
require_once dirname(__DIR__, 3) . '/sales/imei_orders/includes/dpd_printer_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$order_id = isset($_POST['order_id']) ? (int)$_POST['order_id'] : 0;
$sales_order_id = isset($_POST['sales_order_id']) ? (int)$_POST['sales_order_id'] : 0;

if ($order_id === 0 && $sales_order_id > 0) {
    $lookup_stmt = mysqli_prepare($conn, "SELECT goodsout_order_id FROM tbl_imei_sales_orders WHERE order_id = ? LIMIT 1");
    if (!$lookup_stmt) {
        echo json_encode(['success' => false, 'message' => 'Unable to prepare lookup statement.']);
        exit;
    }
    mysqli_stmt_bind_param($lookup_stmt, "i", $sales_order_id);
    mysqli_stmt_execute($lookup_stmt);
    $lookup_result = mysqli_stmt_get_result($lookup_stmt);
    if ($lookup_result && ($row = mysqli_fetch_assoc($lookup_result)) && !empty($row['goodsout_order_id'])) {
        $order_id = (int)$row['goodsout_order_id'];
    }
    mysqli_stmt_close($lookup_stmt);
}

if ($order_id === 0) {
    echo json_encode(['success' => false, 'message' => 'A valid goods out order ID is required.']);
    exit;
}

$details_stmt = mysqli_prepare($conn, "
    SELECT po_box, item_imei, tracking_no
    FROM tbl_orders
    WHERE order_id = ?
");
if (!$details_stmt) {
    echo json_encode(['success' => false, 'message' => 'Unable to prepare order lookup.']);
    exit;
}
mysqli_stmt_bind_param($details_stmt, "i", $order_id);
mysqli_stmt_execute($details_stmt);
$details_result = mysqli_stmt_get_result($details_stmt);

if (!$details_result || mysqli_num_rows($details_result) === 0) {
    echo json_encode(['success' => false, 'message' => 'No matching order rows found for the provided ID.']);
    mysqli_stmt_close($details_stmt);
    exit;
}

$po_box = '';
$tracking_no = '';
$item_imei = '';

while ($row = mysqli_fetch_assoc($details_result)) {
    if ($po_box === '' && !empty($row['po_box'])) {
        $value = trim($row['po_box']);
        if ($value !== '') {
            $po_box = $value;
        }
    }
    if ($tracking_no === '' && !empty($row['tracking_no'])) {
        $value = trim($row['tracking_no']);
        if ($value !== '') {
            $tracking_no = $value;
        }
    }
    if ($item_imei === '' && !empty($row['item_imei'])) {
        $value = trim($row['item_imei']);
        if ($value !== '') {
            $item_imei = $value;
        }
    }
}

mysqli_stmt_close($details_stmt);

if ($po_box === '') {
    echo json_encode(['success' => false, 'message' => 'No BackMarket order reference (PO box) recorded for this order.']);
    exit;
}

if (!ctype_digit($po_box)) {
    echo json_encode(['success' => false, 'message' => 'BackMarket order reference must be numeric.']);
    exit;
}

if ($tracking_no === '') {
    echo json_encode(['success' => false, 'message' => 'Tracking number missing. Please book the shipment before updating BackMarket.']);
    exit;
}

if ($item_imei === '') {
    echo json_encode(['success' => false, 'message' => 'No IMEI found for this order.']);
    exit;
}

$update_bm_path = escapeshellarg(__DIR__ . '/update_bm.php');
$delivery_note_printer_endpoint = resolveBmDeliveryNotePrinter();
$command = sprintf(
    "php %s -oid %s -imei %s -tr %s -dn %s 2>&1",
    $update_bm_path,
    escapeshellarg($po_box),
    escapeshellarg($item_imei),
    escapeshellarg($tracking_no),
    escapeshellarg($delivery_note_printer_endpoint)
);

$output = [];
$exit_code = 0;
exec($command, $output, $exit_code);
$output_text = trim(implode("\n", $output));

if ($exit_code !== 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to update BackMarket order.',
        'details' => $output_text
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'BackMarket order updated successfully.',
    'details' => $output_text
]);
exit;
?>
