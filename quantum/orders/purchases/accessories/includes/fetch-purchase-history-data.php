<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct purchase_id) as total from tbl_accessories_purchases")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    if(isset($_POST['purchase_id'])){

        $fetch_items = mysqli_query($conn,"
        select 
        distinct pr.purchase_id,
        pr.date,
        sup.name as supplier 

        from tbl_accessories_purchases as pr

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id
        
        where pr.purchase_id='".$_POST['purchase_id']."'")
        or die('Error: '.mysqli_error($conn)); 

    }
    else if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        select 
        distinct pr.purchase_id,
        pr.date,
        sup.name as supplier 

        from tbl_accessories_purchases as pr

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id

        ORDER BY pr.id DESC
        LIMIT 10 OFFSET ".$page_id)
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
