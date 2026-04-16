<?php include '../../../db_config.php';  ?>
<?php

    // Only not-completed orders within last 30 days for dashboard widget
    $where_clause = " WHERE is_completed = 0 AND date >= (CURDATE() - INTERVAL 30 DAY)";

    // Total rows
    $fetch_total_rows_count = mysqli_query($conn, "SELECT COUNT(DISTINCT order_id) AS total
    FROM tbl_imei_sales_orders".$where_clause)
    or die('Error: '.mysqli_error($conn));
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];


    if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        SELECT 
            s.order_id,
            MAX(s.date) AS date,
            MAX(s.customer_id) AS customer_id,
            c.name AS customer_name,
            MAX(s.po_ref) AS po_ref,
            COUNT(*) AS qty
        FROM tbl_imei_sales_orders s
        INNER JOIN tbl_customers c ON c.customer_id = s.customer_id
        ".$where_clause."
        GROUP BY s.order_id
        ORDER BY MAX(s.date) DESC
        LIMIT 10 OFFSET ".$page_id)
        or die('Error: '.mysqli_error($conn));
    }
    else if(isset($_POST['order_id'])){

        $id = intval($_POST['order_id']);
        $where_clause2 = " WHERE is_completed = 0 AND order_id = ".$id." AND date >= (CURDATE() - INTERVAL 30 DAY)";

        $fetch_items = mysqli_query($conn,"
        SELECT 
            s.order_id,
            MAX(s.date) AS date,
            MAX(s.customer_id) AS customer_id,
            c.name AS customer_name,
            MAX(s.po_ref) AS po_ref,
            COUNT(*) AS qty
        FROM tbl_imei_sales_orders s
        INNER JOIN tbl_customers c ON c.customer_id = s.customer_id
        ".$where_clause2."
        GROUP BY s.order_id
        ORDER BY MAX(s.date) DESC
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

