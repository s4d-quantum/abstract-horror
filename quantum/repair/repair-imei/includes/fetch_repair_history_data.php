<?php include '../../../db_config.php';  ?>
<?php


    if(isset($_POST['purchase_id'])){

        $fetch_items = mysqli_query($conn,"
        select 
        pur.purchase_id,
        pur.repair_required,
        pur.repair_completed,
        pur.date,
        pur.supplier_id,
        pur.purchase_return,
        pur.tray_id

        from tbl_purchases as pur

        where pur.repair_required=1 AND 
        pur.purchase_id='".$_POST['purchase_id']."' 
        GROUP BY pur.purchase_id")
        or die('Error: '.mysqli_error($conn)); 

    }
    else if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        select 
        distinct pur.purchase_id,
        pur.repair_required,
        pur.repair_completed,
        pur.date,
        pur.supplier_id,
        pur.purchase_return,
        pur.tray_id

        from tbl_purchases as pur

        where pur.repair_required=1 GROUP BY purchase_id

        ORDER BY pur.id DESC

        LIMIT 10 OFFSET ".$page_id)
        or die('Error: '.mysqli_error($conn)); 
    }

    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        // 'total_rows' => $total_rows_count,
        'data' => $results_array
    ));
