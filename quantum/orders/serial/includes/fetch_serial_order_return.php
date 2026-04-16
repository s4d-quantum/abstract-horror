<?php include '../../../db_config.php';  ?>
<?php

$item_code = $_POST['item_code'];
$customer = $_POST['customer'];

$fetch_data = mysqli_query($conn,"
select * from tbl_serial_products as pr

inner join tbl_serial_orders as ord 
on ord.item_code = pr.item_code 

where 
pr.item_code='".$item_code."' AND 
pr.status = 0 AND 
ord.order_return = 0 AND 
ord.customer_id='".$customer."'");

$row = mysqli_fetch_assoc($fetch_data);
print json_encode($row);
