<?php include '../../../db_config.php';  ?>
<?php

    $purchase_id = $_POST['purchase_id'];
    $fetch_purchase_query = mysqli_query($conn,"select * from tbl_accessories_purchases
    where purchase_id = '".$purchase_id."'");
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_purchase_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);
