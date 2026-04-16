<?php include '../../../db_config.php';  ?>
<?php

    // Variables 
    $searchModel = isset($_POST['searchModel']) && $_POST['searchModel']  != '' ?  $_POST['searchModel']:NULL;
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput']:NULL;
    $customer = isset($_POST['searchCustomer']) && $_POST['searchCustomer']  != '' ?  $_POST['searchCustomer']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate']  != '' ?  $_POST['fromDate']:NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate']  != '' ?  $_POST['toDate']:NULL;

    // Fetch Order Ids where model = $searchModel 
    $model_query = "SELECT DISTINCT ord.order_id FROM `tbl_parts_orders` as ord inner join tbl_parts_products as pr on pr.id = ord.product_id where pr.title LIKE '%".$searchModel."%'";

    $query = "
        select 
        count(distinct ord.order_id) as total 
        from tbl_parts_orders as ord

        inner join tbl_customers as cst 
        on cst.customer_id = ord.customer_id";

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($searchModel) || 
            !is_null($searchInput) || 
            !is_null($customer) || 
            !is_null($fromDate) || 
            !is_null($toDate)
        ) ? " where ord.order_id > 0 ":"";
        
        // SEARCH MODEL
        $query .= !is_null($searchModel) ? " AND ord.order_id IN (".$model_query.") " : "";

        // SEARCH INPUT
        $query .= !is_null($searchInput) ? " AND ord.order_id ='".$searchInput."' " : "";

        // SUPPLIER
        $query .= !is_null($customer) ? " AND cst.customer_id ='".$customer."' " : "";

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