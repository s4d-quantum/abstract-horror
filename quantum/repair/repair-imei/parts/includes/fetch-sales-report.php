<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "select 
    
    distinct pd.item_imei,
    tc.item_details,
    tc.item_brand,
    pd.item_grade,
    pd.item_gb,
    pd.item_color,
    
    pr.supplier_id

    from tbl_imei as pd 
    left join tbl_tac as tc on 
    tc.item_tac = pd.item_tac
    
    left join 
    tbl_purchases as pr on 
    pr.item_imei = pd.item_imei 

    left join tbl_orders as ord on 
    ord.item_imei = pd.item_imei 
   
    where ord.order_id=".$_POST['order_id'];

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);