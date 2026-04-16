<?php include '../../../db_config.php'; if (session_status() === 
PHP_SESSION_NONE) {
    session_start();
}
mysqli_select_db($conn, 's4d_england_db'); header('Content-Type: 
application/json');
// Handle pagination via pageId (POST) as before
$pageId = isset($_POST['pageId']) ? intval($_POST['pageId']) : 1; 
$pageId = max(1, $pageId); $limit = 10; $offset = ($pageId - 1) * 
$limit;
// Get total count
$countQuery = "SELECT COUNT(*) AS total FROM tbl_purchases WHERE 
priority > 1"; $countResult = mysqli_query($conn, $countQuery) or 
die(json_encode(['error' => mysqli_error($conn)])); $totalRow = 
mysqli_fetch_assoc($countResult); $totalCount = (int) 
$totalRow['total'];
// Fetch paginated results
$dataQuery = " SELECT p.id AS pur_id, p.date, p.priority, p.qc_required, 
        p.qty AS total, s.name AS supplier
    FROM tbl_purchases p LEFT JOIN tbl_suppliers s ON p.supplier_id = 
        s.supplier_id
    WHERE p.priority > 1 ORDER BY p.priority DESC, p.date DESC LIMIT 
    $limit OFFSET $offset
"; $fetch_items = mysqli_query($conn, $dataQuery) or 
die(json_encode(['error' => mysqli_error($conn)])); $results_array = []; 
while ($row = mysqli_fetch_assoc($fetch_items)) {
    $results_array[] = $row;
}
// Output JSON
echo json_encode([ 'total_rows' => $totalCount, 'limit' => $limit, 
    'offset' => $offset, 'data' => $results_array
]);
