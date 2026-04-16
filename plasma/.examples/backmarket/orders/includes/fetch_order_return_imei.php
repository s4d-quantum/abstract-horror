<?php include '../../../db_config.php';  ?>
<?php

$item_imei = $_POST['item_imei'];
$customer = $_POST['customer'];

$fetch_data = mysqli_query($conn,"select 
    im.item_imei,
    im.item_color,
    im.item_gb,
    cat.title,
    tc.item_details,
    tc.item_brand 
    from tbl_tac as tc 

    inner join tbl_imei as im on 
    tc.item_tac = im.item_tac 

    inner join 
    tbl_categories as cat on 
    tc.item_brand = cat.category_id 

    inner join tbl_orders as ord on 
    ord.item_imei = im.item_imei

    where 
    ord.order_return = 0 AND 
    im.item_imei='".$item_imei."' AND 
    im.status = 0 AND 
    ord.customer_id='".$customer."'");

$row = mysqli_fetch_assoc($fetch_data);
print json_encode($row);
