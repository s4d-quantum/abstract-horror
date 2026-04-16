<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct return_id) as total from tbl_accessories_order_return")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    if(isset($_POST['return_id'])){

        $fetch_items = mysqli_query($conn,"
        select 
        distinct ret.return_id,
        ret.order_id,
        cst.name as customer,
        ret.date

        from tbl_accessories_order_return as ret

        inner join tbl_accessories_orders on 
        tbl_accessories_orders.order_id = ret.order_id 

        inner join tbl_customers as cst on 
        cst.customer_id = tbl_accessories_orders.customer_id 

        GROUP BY ret.return_id

        where return_id='".$_POST['return_id']."'")
        or die('Error: '.mysqli_error($conn)); 

    }
    else if(isset($_POST['pageId'])){

        $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

        $fetch_items = mysqli_query($conn,"
        select 
        distinct ret.return_id,
        ret.order_id,
        cst.name as customer,
        ret.date

        from tbl_accessories_order_return as ret

        inner join tbl_accessories_orders on 
        tbl_accessories_orders.order_id = ret.order_id 

        inner join tbl_customers as cst on 
        cst.customer_id = tbl_accessories_orders.customer_id 

        GROUP BY ret.return_id

        ORDER BY ret.id DESC

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
