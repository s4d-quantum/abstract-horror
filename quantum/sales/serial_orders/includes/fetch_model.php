<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "select 
    distinct item_details
    from 
    tbl_serial_products 
    where 
    status = 1 and item_brand = '".$_POST['category']."'";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);