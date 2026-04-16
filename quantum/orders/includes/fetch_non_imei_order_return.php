<?php include '../../db_config.php';  ?>
<?php

if(isset($_POST['item_imei'])){
    // print json_encode(array("imei_data"=>$item_imei, "tac_data"=>$item_tac));
}

// mysqli_fetch_all(result,resulttype);
//resulttype => MYSQLI_ASSOC/MYSQLI_NUM/MYSQLI_BOTH
$item_code = $_POST['item_code'];
$fetch_data = mysqli_query($conn,"select 
od.date,
od.item_code,
od.item_qty,
pr.status,
pr.item_details,
pr.item_brand 
from tbl_non_imei_orders as od 
inner join 
tbl_non_imei_products as pr 
on od.item_code = pr.item_code 
where 
od.item_code = '".$item_code."' and 
od.order_return = 0");

$row = mysqli_fetch_assoc($fetch_data);
print json_encode($row);
