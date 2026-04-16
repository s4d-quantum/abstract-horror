<?php include '../../db_config.php';  ?>
<?php

$item_imei = $_POST['item_imei'];
$fetch_data = mysqli_query($conn,"select 
    im.item_tac,
    im.item_imei,
    im.item_color,
    im.item_gb,
    im.purchase_return,
    cat.title,
    tc.item_details,
    tc.item_brand 
    from tbl_tac as tc 
    inner join 
    tbl_imei as im 
    on 
    tc.item_tac = im.item_tac 
    inner join 
    tbl_categories as cat 
    on 
    tc.item_brand = cat.category_id
    where 
    im.purchase_return = 0 AND 
    im.status = 1 
    AND im.item_imei='".$item_imei."'");
$results_array = array();
while ($row = mysqli_fetch_assoc($fetch_data)) {
    $results_array[] = $row;
}
print json_encode($results_array);
