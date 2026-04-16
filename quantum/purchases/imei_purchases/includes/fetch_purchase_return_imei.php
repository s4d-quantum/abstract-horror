<?php include '../../../db_config.php';  ?>
<?php

$item_imei = $_POST['item_imei'];
$supplier = $_POST['supplier'];
$fetch_data = mysqli_query($conn,"select 
    im.item_tac,
    im.item_imei,
    im.item_color,
    im.item_grade,
    im.item_gb,
    cat.title,
    tc.item_details,
    tc.item_brand,
    pu.purchase_return

    from tbl_tac as tc 

    inner join 
    tbl_imei as im 
    on tc.item_tac = im.item_tac 

    inner join 
    tbl_categories as cat 
    on tc.item_brand = cat.category_id

    inner join 
    tbl_purchases as pu 
    on pu.purchase_id = im.purchase_id

    where 
    pu.purchase_return = 0 AND 
    im.status = 1 
    AND im.item_imei='".$item_imei."' 
    AND pu.supplier_id='".$supplier."'");
$results_array = array();
while ($row = mysqli_fetch_assoc($fetch_data)) {
    $results_array[] = $row;
}
print json_encode($results_array);



