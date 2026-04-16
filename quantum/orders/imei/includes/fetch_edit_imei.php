<?php include '../../../db_config.php';  ?>
<?php

if(isset($_POST['item_imei'])){

    $item_imei = mysqli_real_escape_string($conn, $_POST['item_imei']);

    // check if qc required 
    $check_qc = mysqli_query($conn,"select pr.qc_required from tbl_imei as im 
    inner join tbl_purchases as pr 
    on pr.purchase_id = im.purchase_id where 
    im.item_imei ='".$item_imei."'")
    or die('Error:: ' . mysqli_error($conn));
    $check_qc_value = mysqli_fetch_assoc($check_qc);

    // check if qc required 
    if($check_qc_value['qc_required'] == 0){
        $fetch_data = mysqli_query($conn,"select 
        pr.purchase_id, 
        pr.qc_required,
        cat.title, 
    
        im.item_gb,
        im.item_color,
        im.item_imei,
    
        pr.tray_id,
        tc.item_tac,
        tc.item_details,
        tc.item_brand
    
        from tbl_tac as tc 
    
        inner join tbl_imei as im 
        on tc.item_tac = im.item_tac 
    
        inner join tbl_purchases as pr on 
        pr.purchase_id = im.purchase_id 
        /* Deduplicate trays so repeated tray rows don't duplicate imeis */
        left join (
            SELECT tray_id, MIN(COALESCE(locked, 0)) AS locked
            FROM tbl_trays
            GROUP BY tray_id
        ) as t on t.tray_id = pr.tray_id
    
        inner join tbl_categories as cat 
        on cat.category_id = tc.item_brand 
        
        where im.item_imei='".$item_imei."' 
        AND 
        im.status = 1 AND 
        pr.qc_required = 0 AND 
        COALESCE(t.locked, 0) = 0")
        or die('Error:: ' . mysqli_error($conn));
    
    }
    // if qc not required 
    else{
        $fetch_data = mysqli_query($conn,"select 
        pr.purchase_id, 
        pr.qc_required,
        cat.title, 
    
        im.item_gb,
        im.item_color,
        im.item_imei,
    
        pr.tray_id,
        tc.item_tac,
        tc.item_details,
        tc.item_brand,
        it.item_cosmetic_passed,
        it.item_functional_passed
    
        from tbl_tac as tc 
    
        inner join tbl_imei as im 
        on tc.item_tac = im.item_tac 
    
        inner join tbl_purchases as pr on 
        pr.purchase_id = im.purchase_id 
        /* Deduplicate trays so repeated tray rows don't duplicate imeis */
        left join (
            SELECT tray_id, MIN(COALESCE(locked, 0)) AS locked
            FROM tbl_trays
            GROUP BY tray_id
        ) as t on t.tray_id = pr.tray_id
    
        inner join tbl_categories as cat 
        on cat.category_id = tc.item_brand 
    
        inner join tbl_qc_imei_products as it 
        on it.item_code = im.item_imei
    
        where im.item_imei='".$item_imei."' 
        AND 
        im.status = 1 AND it.item_cosmetic_passed = 1 AND 
        it.item_functional_passed = 1 AND 
        pr.qc_completed = 1 AND 
        COALESCE(t.locked, 0) = 0")
        or die('Error:: ' . mysqli_error($conn));
    
    }

    // $result = mysqli_fetch_assoc($fetch_data)
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_data)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);
}

