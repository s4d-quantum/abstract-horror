<?php include '../../../../db_config.php';  ?>
<?php

    // BASIC QUERY
    $query = "
    SELECT 
        
    parts.item_code,
    parts.part_qty as item_qty,
    parts.part_id,
    
    pro.title as part_title,
    pro.item_color,
    pro.item_brand as part_brand
      
    from tbl_repair_imei_parts as parts 

    inner join 
    tbl_parts_products as pro 
    on pro.id = parts.part_id

    where purchase_id = ".$_POST['purchase_id']." 
    AND item_code='".$_POST['item_code']."' 
    
    ";

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);