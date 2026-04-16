<?php include '../../../db_config.php';  ?>
<?php

    $items = $_POST['items']['data'];
    $records = array();
    for($i=0; $i<count($items); $i++){
        // see if IMEI already exists
       $validate_query = mysqli_query($conn,"
        select 
        im.item_imei,
        pr.purchase_return 
        from tbl_imei as im 
        
        inner join tbl_purchases as pr 
        on pr.item_imei = im.item_imei 
        
        where 
        
        im.item_imei='".$items[$i]."' AND 
        (im.status = 1 OR 
        pr.purchase_return = 0)")
        or die('Error:: ' . mysqli_error($conn));
        $row = mysqli_fetch_assoc($validate_query);

        if(is_array($row) && count($row) > 0){
            $records[] = $row['item_imei'];
        }
    }

    // output
    print json_encode($records);
