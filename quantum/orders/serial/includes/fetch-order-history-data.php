<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct order_id) as total 
    from tbl_serial_orders")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    // Variables 
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput']:NULL;
    $customer = isset($_POST['searchCustomer']) && $_POST['searchCustomer']  != '' ?  $_POST['searchCustomer']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate']  != '' ?  $_POST['fromDate']:NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate']  != '' ?  $_POST['toDate']:NULL;

    if(isset($_POST['pageId'])){
        $pageId = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;
    }

    $query = "
        select 
        distinct ord.order_id,
        ord.date,
        ord.unit_confirmed,
        ord.is_delivered,
        ord.po_box as po_ref,
        cst.name as customer 

        from tbl_serial_orders as ord

        inner join tbl_customers as cst 
        on cst.customer_id = ord.customer_id";

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($searchInput) || 
            !is_null($customer) || 
            !is_null($fromDate) || 
            !is_null($toDate)
        ) ? " where ord.order_id > 0 ":"";
        
        // SEARCH INPUT
        $query .= !is_null($searchInput) ? " AND ord.order_id ='".$searchInput."' " : "";

        // SUPPLIER
        $query .= !is_null($customer) ? " AND cst.customer_id ='".$customer."' " : "";

        // FROM DATE
        $query .= !is_null($fromDate) ? " AND ord.date >= '".$fromDate."' " : "";

        // TO DATE
        $query .= !is_null($toDate) ? " AND ord.date <='".$toDate."' " : "";

        $query .= " ORDER BY ord.order_id DESC LIMIT 10 OFFSET ".$pageId;


    $fetch_data = mysqli_query($conn, $query)
        or die('Error: '.mysqli_error($conn)); 
    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_data)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        'total_rows' => $total_rows_count,
        'data' => $results_array
    ));