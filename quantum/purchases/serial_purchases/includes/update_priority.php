<?php include '../../../db_config.php';  ?>
<?php

    $pid = $_POST['purchase_id'];
    $priority = $_POST['priority'];
    $date = date("Y-m-d");

    $update_priority_query = mysqli_query($conn,"update tbl_serial_purchases 
    set priority = ".$priority." where purchase_id=".$pid);
        
    print json_encode($update_priority_query);
