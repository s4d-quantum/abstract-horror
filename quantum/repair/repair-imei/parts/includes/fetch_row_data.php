<?php include '../../../../db_config.php';  ?>
<?php

    $item_code = $_POST['item_code'];

    // 1 - FIRST GET THE TAC OF SELECTED IMEI 
   $fetch_tac = mysqli_query($conn, "select item_tac from tbl_imei where item_imei = '".$item_code."'")
    or die('Error: '.mysqli_error($conn));  
   $item_tac = mysqli_fetch_assoc($fetch_tac);


    // BASIC QUERY
    $query = "select 
    id,
    title,
    item_color,
    item_qty,
    item_brand
    
    from tbl_parts_products 
    WHERE 
    item_tac LIKE '%".$item_tac['item_tac']."%'     
    AND item_qty > 0
    ";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    // print json_encode($results_array);
    print json_encode($results_array);


