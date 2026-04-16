<?php include '../../../db_config.php';  ?>

<?php

// Real-time availability check endpoint
// Returns available units matching criteria, excluding reserved ones

$supplier = isset($_POST['supplier']) ? $_POST['supplier'] : null;
$category = isset($_POST['category']) ? $_POST['category'] : null;
$color = isset($_POST['color']) ? $_POST['color'] : null;
$grade = isset($_POST['grade']) ? $_POST['grade'] : null;
$gb = isset($_POST['gb']) ? $_POST['gb'] : null;
$model = isset($_POST['model']) ? $_POST['model'] : null;
$quantity_needed = isset($_POST['quantity']) ? intval($_POST['quantity']) : 1;

// Count available units matching criteria
$query = "
SELECT COUNT(*) as available_count
FROM tbl_imei as im
LEFT JOIN tbl_tac as tc ON tc.item_tac = im.item_tac
LEFT JOIN tbl_purchases as pr ON pr.item_imei = im.item_imei
LEFT JOIN tbl_trays as t ON t.tray_id = pr.tray_id
WHERE
-- Exclude reserved items
NOT EXISTS(SELECT 1 FROM tbl_imei_sales_orders WHERE item_code = im.item_imei AND is_completed = 0) AND
-- Exclude returned/purchased back items
pr.purchase_return = 0 AND
-- Exclude locked trays
COALESCE(t.locked, 0) = 0 AND
-- Only in-stock items
im.status = 1 AND
-- QC requirements met
(
    (pr.qc_required = 0) OR
    (pr.qc_required = 1 AND pr.qc_completed = 1 AND
     EXISTS(SELECT 1 FROM tbl_qc_imei_products WHERE
         item_cosmetic_passed = 1 AND item_functional_passed = 1 AND
         item_code = im.item_imei AND purchase_id = pr.purchase_id)
    )
)
";

// Add filters if provided
$conditions = array();
if ($supplier) $conditions[] = "pr.supplier_id = '".$supplier."'";
if ($category) $conditions[] = "tc.item_brand = '".$category."'";
if ($color) $conditions[] = "im.item_color = '".$color."'";
if ($grade) $conditions[] = "im.item_grade = ".intval($grade);
if ($gb) $conditions[] = "im.item_gb = '".$gb."'";
if ($model) $conditions[] = "tc.item_details LIKE '%".$model."%'";

if (!empty($conditions)) {
    $query .= " AND " . implode(" AND ", $conditions);
}

$availability_result = mysqli_query($conn, $query);
$availability_data = mysqli_fetch_assoc($availability_result);
$available_count = $availability_data['available_count'];

// Check if we have enough units
$response = array(
    'success' => true,
    'available_count' => $available_count,
    'quantity_needed' => $quantity_needed,
    'has_enough_stock' => ($available_count >= $quantity_needed),
    'message' => $available_count >= $quantity_needed
        ? 'Enough stock available'
        : 'Insufficient stock available'
);

header('Content-Type: application/json');
echo json_encode($response);
?>