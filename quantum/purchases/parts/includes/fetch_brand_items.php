<?php include '../../../db_config.php';  ?>
<?php

    $brandId = $_POST['brandId'];
    $fetch_brand_query = mysqli_query($conn,"select * from tbl_parts_products
    where item_brand = '".$brandId."' AND char_length(item_tac) > 0");
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_brand_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);
