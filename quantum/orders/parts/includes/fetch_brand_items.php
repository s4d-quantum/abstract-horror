<?php include '../../../db_config.php';  ?>
<?php

    $brandId = $_POST['brandId'];
    $model = $_POST['model'];
    
    $fetch_parts_query = mysqli_query($conn,"SELECT * FROM tbl_parts_products
    WHERE item_brand = '".$brandId."' AND item_model = '".$model."' AND char_length(item_tac) > 0
    ORDER BY title, item_color");
    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_parts_query)) {
        $results_array[] = $row;
    }
    print json_encode($results_array);
