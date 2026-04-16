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
        distinct srd.order_id,
        srd.date,
        cst.name as customer

        from tbl_imei_sales_orders as srd

        inner join tbl_customers as cst 
        on cst.customer_id = srd.customer_id 

        where srd.goodsout_order_id IS NULL

        ORDER BY srd.order_id DESC

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
