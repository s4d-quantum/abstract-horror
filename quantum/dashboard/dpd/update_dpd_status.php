<?php include '../../db_config.php';  ?>
<?php

$order_id = $_POST['order_id'];
$status = $_POST['status'];

    $query = "update tbl_orders set is_delivered=".$status." 
    where order_id='".$order_id."'";
    $update_dpd_query = mysqli_query($conn, $query)
    or die('Error: '.mysqli_error($conn)); 


    print json_encode(array(
        'result' => $update_dpd_query,
        'query' => $query
    ));
