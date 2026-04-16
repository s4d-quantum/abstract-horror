<?php include '../../../db_config.php';  ?>
<?php

    $item_tac = $_POST['TAC'];
    $fetch_tac_query = mysqli_query($conn,"select * from tbl_tac where 
    item_tac = '".$item_tac."'");
    $fetch_tac = mysqli_fetch_assoc($fetch_tac_query);
    
    // fetch relevant IMEIs
    // $fetch_imei_query = mysqli_query($conn,"select im.item_imei,im.item_tac,im.purchase_id,
    // tc.item_brand,tc.item_gb,tc.item_gb from tbl_imei as im inner join tbl_tac as tc on 
    // im.item_tac = tc.item_tac where im.item_imei = '".$item_imei."'");
    // $fetch_imei = mysqli_fetch_assoc($fetch_imei_query);
    // $result_array = array();
    // while ($row = mysqli_fetch_assoc($fetch_imei_query)) {
    //     $result_array[] = $row;
    // }
    
    // output
    print json_encode(array(
        'item_tac' => $fetch_tac['item_tac'],
        'details' => $fetch_tac
    ));
