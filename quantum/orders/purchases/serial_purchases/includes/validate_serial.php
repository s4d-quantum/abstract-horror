<?php include '../../../db_config.php';  ?>
<?php

    $items = $_POST['items']['data'];
    $records = array();
    for($i=0; $i<count($items); $i++){
        // see if IMEI already exists
       $validate_query = mysqli_query($conn,"
        select 
        pd.item_code,
        pr.purchase_return 

        from tbl_serial_products as pd 
        
        inner join tbl_serial_purchases as pr 
        on pr.item_code = pd.item_code 
        
        where 

        pd.item_code='".$items[$i]."' AND 
        (pd.status = 1 OR 
        pr.purchase_return = 0)")
        or die('Error:: ' . mysqli_error($conn));
        $row = mysqli_fetch_assoc($validate_query);

        if(is_array($row) && count($row) > 0){
            $records[] = $row['item_code'];
        }
    }

    // output
    print json_encode($records);
