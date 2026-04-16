<?php include '../../db_config.php';  ?>
<?php

if(isset($_POST['item_imei'])){

    $item_imei = $_POST['item_imei'];
    $fetch_data = mysqli_query($conn,"select 
    pr.purchase_id, 
    pr.qc_required,
    cat.title, 
    im.item_gb,
    im.item_color,
    im.item_imei,
    pr.tray_id,
    tc.item_tac,
    tc.item_details,
    tc.item_brand
    from tbl_tac as tc 
    inner join tbl_imei as im 
    on tc.item_tac = im.item_tac 
    inner join tbl_purchases as pr on 
    pr.purchase_id = im.purchase_id 
    inner join tbl_categories as cat 
    on cat.category_id = tc.item_brand 
    where im.item_imei='".$item_imei."' 
    AND 
    im.status = 1 AND pr.qc_required = 0")
    or die('Error:: ' . mysqli_error($conn));
    // $result = mysqli_fetch_assoc($fetch_data)
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_data)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);
}




