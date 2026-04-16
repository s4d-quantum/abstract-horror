<?php include '../../../db_config.php';  ?>
<?php

    // Determine whether to include BackMarket orders based on request
    $include_bm = isset($_POST['include_bm']) && $_POST['include_bm'] == '1';

    $where_clause = $include_bm ? "" : " where customer_id != 'CST-78'";

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct order_id) as total
    from tbl_imei_sales_orders".$where_clause)
    or die('Error: '.mysqli_error($conn));
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];


    if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        select

        order_id,
        customer_id,
        date,
        is_completed,
        goodsout_order_id,
        user_id

        from tbl_imei_sales_orders".
        $where_clause.
        " group by order_id ORDER BY order_id desc

        LIMIT 10 OFFSET ".$page_id)
        or die('Error: '.mysqli_error($conn));
    }
    else if(isset($_POST['order_id'])){

        $fetch_items = mysqli_query($conn,"
        select

        order_id,
        customer_id,
        date,
        is_completed,
        goodsout_order_id,
        user_id

        from tbl_imei_sales_orders
        ".($include_bm ? " where order_id=".$_POST['order_id'] : " where customer_id != 'CST-78' AND order_id=".$_POST['order_id'])."
        group by order_id ORDER BY order_id

        ")
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
