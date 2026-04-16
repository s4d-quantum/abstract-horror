<?php include '../../../db_config.php';  ?>
<?php

$item_code = $_POST['item_code'];
$supplier = $_POST['supplier'];

$fetch_data = mysqli_query($conn,"select * from tbl_serial_products as pr 
inner join tbl_serial_purchases as pu 
on pu.item_code = pr.item_code
where pr.item_code='".$item_code."' 
AND pr.status = 1 
AND pu.purchase_return = 0 
AND pu.supplier_id='".$supplier."'");

$row = mysqli_fetch_assoc($fetch_data);
print json_encode($row);
