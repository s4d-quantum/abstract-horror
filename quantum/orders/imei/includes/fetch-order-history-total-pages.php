<?php include '../../../db_config.php';  ?>
<?php

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

    $query = "
        select 
        count(distinct ord.order_id) as total 
        from tbl_orders as ord

        inner join tbl_customers as cst 
        on cst.customer_id = ord.customer_id";

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


    $fetch_total_rows_count = mysqli_query($conn, $query)
        or die('Error: '.mysqli_error($conn)); 

    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    print json_encode(array(
        'total_rows' => $total_rows_count
    ));
