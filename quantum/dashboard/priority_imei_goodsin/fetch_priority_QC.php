<?php include '../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct purchase_id) as total 
    from tbl_purchases where priority > 0")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

    if(isset($_POST['pageId'])){


        $fetch_items = mysqli_query($conn,"
        select 
        distinct pr.purchase_id as pur_id,
        pr.date,
        pr.qc_required,
        pr.priority,
        sup.name as supplier,
        (select count(purchase_id) from 
        tbl_purchases where purchase_id = pr.purchase_id) as total 

        from tbl_purchases as pr

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id 

        where priority > 0

        ORDER BY pur_id DESC

         ".$page_id)
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
