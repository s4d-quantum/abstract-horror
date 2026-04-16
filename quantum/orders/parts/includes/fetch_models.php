<?php include '../../../db_config.php';  ?>
<?php

    $brandId = $_POST['brandId'];
    $fetch_models_query = mysqli_query($conn,"SELECT DISTINCT item_model FROM tbl_parts_products 
    WHERE item_brand = '".$brandId."' AND item_model IS NOT NULL AND item_model != '' 
    ORDER BY item_model");
    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_models_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);

?>