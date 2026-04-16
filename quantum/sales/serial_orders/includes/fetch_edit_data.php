<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "
    SELECT 
    supplier_id,
    customer_id,
    user_id,
    item_details,
    item_brand,
    item_grade,
    tray_id,
    item_code
      
    from tbl_serial_sales_orders 
    where order_id = ".$_POST['order_id'] ." 
    order by id";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);