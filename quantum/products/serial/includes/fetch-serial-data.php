<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(*) as total from tbl_serial_products")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    if(isset($_POST['searchIMEI'])){

        $fetch_items = mysqli_query($conn,"
        select 
        distinct pr.purchase_id,
        
        pr.item_code,
        pr.purchase_return,
        pr.qc_required,
        pr.qc_completed,

        sup.name as supplier,
        
        sr.id,
        sr.status,
        sr.item_details,
        sr.item_brand,
        sr.item_grade

        from tbl_serial_products as sr

        inner join tbl_serial_purchases as pr 
        on sr.item_code = pr.item_code

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id

        where 
        sr.item_code='".$_POST['searchIMEI']."' 
        AND pr.purchase_return = 0")
        or die('Error: '.mysqli_error($conn)); 

    }
    else if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        select 
        distinct pr.purchase_id,
        
        pr.item_code,
        pr.purchase_return,
        pr.qc_required,
        pr.qc_completed,

        sup.name as supplier,
        
        sr.id,
        sr.status,
        sr.item_details,
        sr.item_brand,
        sr.item_grade

        from tbl_serial_products as sr

        inner join tbl_serial_purchases as pr 
        on sr.item_code = pr.item_code

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id

        where pr.purchase_return = 0 
        ORDER BY sr.id DESC

        LIMIT 10 OFFSET ".$page_id)
        or die('Error: '.mysqli_error($conn)); 
    }

        //  qc.item_cosmetic_passed, 
        // qc.item_functional_passed,
        // qc.item_comments

    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        'total_rows' => $total_rows_count,
        'data' => $results_array
    ));
