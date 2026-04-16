<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct return_id) as total from tbl_serial_purchase_return")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    if(isset($_POST['return_id'])){

        $fetch_items = mysqli_query($conn,"
        select 
        distinct ret.return_id,
        ret.purchase_id,
        pur.supplier_id,
        ret.date,
        (select count(return_id) from 
        tbl_serial_purchase_return where return_id = ret.return_id) as total 

        from tbl_serial_purchase_return as ret

        inner join tbl_serial_purchases as pur on 
        pur.purchase_id = ret.purchase_id 

        where ret.return_id=".$_POST['return_id']."
        
        GROUP BY ret.return_id
        
        ")
        or die('Error: '.mysqli_error($conn)); 

    }
    else if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        select 
        distinct ret.return_id,
        ret.purchase_id,
        pur.supplier_id,
        ret.date,
        (select count(return_id) from 
        tbl_serial_purchase_return where return_id = ret.return_id) as total 

        from tbl_serial_purchase_return as ret

        inner join tbl_serial_purchases as pur on 
        pur.purchase_id = ret.purchase_id 

        GROUP BY ret.return_id

        ORDER BY ret.return_id DESC
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
