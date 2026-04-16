<?php include '../../db_config.php';  ?>
<?php

$fetch_data = mysqli_query($conn,"select pr.supplier_id, pr.purchase_id, 
pr.date, ps.item_code, ps.item_brand, ps.item_details, ps.item_qty 
from tbl_non_imei_purchases as pr inner 
join tbl_non_imei_products as ps on ps.purchase_id = pr.purchase_id where 
ps.status = 1");
$results_array = array();
while ($row = mysqli_fetch_assoc($fetch_data)) {
    $results_array[] = $row;
}
print json_encode($results_array);
