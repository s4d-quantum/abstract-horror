<?php include '../../db_config.php';  ?>
<?php

$item_code = $_POST['item_code'];
$fetch_data = mysqli_query($conn,"select * from tbl_non_imei_products 
where item_code='".$item_code."' and item_qty > 0");

$row = mysqli_fetch_assoc($fetch_data);
print json_encode($row);
