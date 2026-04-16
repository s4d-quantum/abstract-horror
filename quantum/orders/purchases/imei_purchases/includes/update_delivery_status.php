<?php include '../../../db_config.php';  ?>
<?php

    $oid = $_POST['return_id'];
    $is_delivered = $_POST['is_delivered'];
    $date = date("Y-m-d");

    $update_unit_query = mysqli_query($conn,"update tbl_purchase_return 
    set is_delivered = ".$is_delivered." where return_id=".$oid);
        
    print json_encode($update_unit_query);