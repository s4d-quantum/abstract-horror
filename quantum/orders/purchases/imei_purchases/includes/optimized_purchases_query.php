<?php include '../../../db_config.php'; ?> <?php
// Example limit and offset - replace with real values or user input 
// validation
$limit = 50; $offset = 0;
// Optimized and valid purchases query
$query = " SELECT pr.purchase_id, pr.date, pr.qc_required, pr.priority, 
  sup.name AS supplier, agg.total, agg.max_return AS purchase_return, 
  pr.has_return_tag
FROM tbl_purchases pr INNER JOIN tbl_suppliers sup ON sup.supplier_id = 
pr.supplier_id LEFT JOIN (
  SELECT purchase_id, COUNT(*) AS total, MAX(purchase_return) AS 
  max_return FROM tbl_purchases GROUP BY purchase_id
) AS agg ON agg.purchase_id = pr.purchase_id ORDER BY pr.purchase_id 
DESC LIMIT $limit OFFSET $offset"; $fetch_results = mysqli_query($conn, 
$query) or die('Query Error: ' . mysqli_error($conn)); $results_array = 
array(); while ($row = mysqli_fetch_assoc($fetch_results)) {
    $results_array[] = $row;
}
header('Content-Type: application/json'); echo 
json_encode($results_array);
?>
