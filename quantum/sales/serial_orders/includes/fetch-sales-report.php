<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "select 
    
    pd.item_code,
    pd.item_details,
    pd.item_brand,
    pd.item_grade,
    
    pr.supplier_id

    from tbl_serial_products as pd 
    
    inner join 
    tbl_serial_purchases as pr on 
    pr.item_code = pd.item_code 

    inner join tbl_serial_orders as ord on 
    ord.item_code = pd.item_code 
   
    where ord.order_id=".$_POST['order_id'];

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);