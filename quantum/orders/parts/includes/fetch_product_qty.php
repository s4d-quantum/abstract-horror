<?php include '../../../db_config.php';  ?>
<?php

    $product = $_POST['productId'];
    $fetch_product_query = mysqli_query($conn,"select * from tbl_parts_products
    where id = ".$product);
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_product_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);
