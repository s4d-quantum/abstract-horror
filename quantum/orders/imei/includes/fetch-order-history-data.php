<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct order_id) as total 
    from tbl_orders")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    // Variables
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput'] : NULL;
    $customer = isset($_POST['searchCustomer']) && $_POST['searchCustomer']  != '' ?  $_POST['searchCustomer'] : NULL;
    $searchDeliveryStatus = isset($_POST['searchDeliveryStatus']) && $_POST['searchDeliveryStatus']  != '' ?  $_POST['searchDeliveryStatus'] : NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate']  != '' ?  $_POST['fromDate'] : NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate']  != '' ?  $_POST['toDate'] : NULL;

    // UI sends yyyy/mm/dd; DB stores yyyy-mm-dd
    if (!is_null($fromDate)) {
        $fromDate = str_replace("/", "-", $fromDate);
    }
    if (!is_null($toDate)) {
        $toDate = str_replace("/", "-", $toDate);
    }

    if(isset($_POST['pageId'])){
        $pageId = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;
    }

    // if(isset($_POST['pageId'])){

    //     $fetch_items = mysqli_query($conn,"
    //         select 
    //         distinct ord.order_id,
    //         ord.date,
    //         pr.qc_required,
    //         pr.priority,
    //         cst.name as supplier,
    //         (select count(order_id) from 
    //         tbl_purchases where order_id = ord.order_id) as total 

    //         from tbl_purchases as pr

    //         inner join tbl_suppliers as sup 
    //         on cst.customer_id = pr.customer_id

    //         ORDER BY ord.order_id DESC

    //         LIMIT 10 OFFSET ".$page_id)
    //         or die('Error: '.mysqli_error($conn)); 
    // }


    $query = "
        SELECT
            ord.order_id,
            MAX(ord.id) AS max_id,
            MAX(ord.date) AS date,
            MAX(ord.unit_confirmed) AS unit_confirmed,
            MAX(ord.is_delivered) AS is_delivered,
            MAX(ord.po_box) AS po_ref,
            MAX(ord.customer_ref) AS customer_ref,
            MAX(ord.delivery_company) AS delivery_company,
            MAX(ord.tracking_no) AS tracking_no,
            MAX(cst.name) AS customer,
            (SELECT MAX(order_return) FROM tbl_orders WHERE order_id = ord.order_id) AS order_return,
            MAX(ord.has_return_tag) AS has_return_tag
        FROM tbl_orders AS ord
        INNER JOIN tbl_customers AS cst
            ON cst.customer_id = ord.customer_id";

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($searchInput) || 
            !is_null($customer) || 
            !is_null($searchDeliveryStatus) || 
            !is_null($fromDate) || 
            !is_null($toDate)
        ) ? " where ord.order_id > 0 ":"";
        
        // SEARCH INPUT
        $query .= !is_null($searchInput) ? " AND ord.order_id ='".$searchInput."' " : "";

        // SUPPLIER
        $query .= !is_null($customer) ? " AND cst.customer_id ='".$customer."' " : "";

        // DELIVERY STATUS
        if (!is_null($searchDeliveryStatus)) {
            if ($searchDeliveryStatus == '1') {
                $query .= " AND ord.is_delivered = '1' ";
            } else {
                $query .= " AND (ord.is_delivered = '0' OR ord.is_delivered IS NULL) ";
            }
        }

        // FROM DATE
        $query .= !is_null($fromDate) ? " AND ord.date >= '".$fromDate."' " : "";

        // TO DATE
        $query .= !is_null($toDate) ? " AND ord.date <='".$toDate."' " : "";

        $query .= " GROUP BY ord.order_id ORDER BY max_id DESC LIMIT 10 OFFSET ".$pageId;


    $fetch_data = mysqli_query($conn, $query)
        or die('Error: '.mysqli_error($conn)); 
    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_data)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        'total_rows' => $total_rows_count,
        'data' => $results_array,
        "query"=>$query
    ));
