<?php include '../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "select 
    DISTINCT ct.title, 
    ct.category_id from tbl_categories as ct 
    
    inner join tbl_serial_products as prd 
    on prd.item_brand = ct.category_id 
        
    inner join tbl_serial_purchases as pr 
    on pr.purchase_id = prd.purchase_id 
    where 
    pr.supplier_id='".$_POST['supplier']."' AND prd.status = 1";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);