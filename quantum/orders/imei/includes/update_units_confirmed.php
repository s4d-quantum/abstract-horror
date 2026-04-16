<?php include '../../../db_config.php';  ?>
<?php

    $oid = $_POST['order_id'];
    $is_unit_confirmed = $_POST['is_unit_confirmed'];
    $date = date("Y-m-d");

    $update_unit_query = mysqli_query($conn,"update tbl_orders 
    set unit_confirmed = ".$is_unit_confirmed." where order_id=".$oid);
        
    print json_encode($update_unit_query);
