<?php include '../../../db_config.php';  ?>
<?php

    if(isset($_POST['item_code'])){

        $fetch_items = mysqli_query($conn,"
        select 
        distinct pr.purchase_id,
        
        pr.item_imei,
        pr.purchase_return,
        pr.tray_id,
        pr.supplier_id,
        pr.qc_required,
        pr.qc_completed,
        
        im.id,
        im.item_color,
        im.item_gb,
        im.item_grade,
        im.status,

        tc.item_details,
        tc.item_tac,
        tc.item_brand

        from tbl_imei as im

        inner join tbl_tac as tc on 
        im.item_tac = tc.item_tac 

        inner join tbl_purchases as pr 
        on im.item_imei = pr.item_imei

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id

        where im.item_imei='".$_POST['searchIMEI']."'")
        or die('Error: '.mysqli_error($conn)); 

    }

    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        'total_rows' => $total_rows_count,
        'data' => $results_array
    ));
