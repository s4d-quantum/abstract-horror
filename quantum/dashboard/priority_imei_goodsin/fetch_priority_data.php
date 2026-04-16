<?php 
include '/var/www/html/db_config.php'; 

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

mysqli_select_db($conn, 's4d_england_db');

$pageId = isset($_POST['pageId']) && $_POST['pageId'] > 1 ? (($_POST['pageId'] - 1) * 10) : 0;

$query = "
    SELECT 
        pr.purchase_id, 
        pr.date, 
        s.name, 
        pr.qc_required, 
        pr.priority,
        (SELECT COUNT(*) FROM tbl_purchases WHERE purchase_id = pr.purchase_id) as total
    FROM 
        tbl_purchases pr
    INNER JOIN 
        tbl_suppliers s ON pr.supplier_id = s.supplier_id
    WHERE 
        pr.priority > 0
    GROUP BY 
        pr.purchase_id
    ORDER BY 
        pr.priority DESC, pr.date DESC
    LIMIT 10 OFFSET $pageId
";

$countResult = mysqli_query($conn, "SELECT COUNT(DISTINCT purchase_id) AS total FROM tbl_purchases WHERE priority > 0");
$total_rows_count = mysqli_fetch_assoc($countResult)['total'];

$fetch_data = mysqli_query($conn, $query) or die('Error: '.mysqli_error($conn));
$results_array = [];

while ($row = mysqli_fetch_assoc($fetch_data)) {
    $results_array[] = $row;
}

echo json_encode([
    'total_rows' => $total_rows_count,
    'data' => $results_array
]);
?>

