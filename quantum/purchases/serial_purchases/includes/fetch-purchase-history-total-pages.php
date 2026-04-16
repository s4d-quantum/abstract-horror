<?php include '../../../db_config.php';  ?>
<?php

    // Variables 
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput']:NULL;
    $supplier = isset($_POST['searchSupplier']) && $_POST['searchSupplier']  != '' ?  $_POST['searchSupplier']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate']  != '' ?  $_POST['fromDate']:NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate']  != '' ?  $_POST['toDate']:NULL;

    $query = "
        select 
        count(distinct pr.purchase_id) as total 
        from tbl_serial_purchases as pr

        inner join tbl_suppliers as sup 
        on sup.supplier_id = pr.supplier_id "; 

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($searchInput) || 
            !is_null($supplier) || 
            !is_null($fromDate) || 
            !is_null($toDate)
        ) ? " where pr.purchase_id > 0 ":"";
        
        // SEARCH INPUT
        $query .= !is_null($searchInput) ? " AND pr.purchase_id ='".$searchInput."' " : "";

        // SUPPLIER
        $query .= !is_null($supplier) ? " AND sup.supplier_id ='".$supplier."' " : "";

        // FROM DATE
        $query .= !is_null($fromDate) ? " AND pr.date >= '".$fromDate."' " : "";

        // TO DATE
        $query .= !is_null($toDate) ? " AND pr.date <='".$toDate."' " : "";


    $fetch_total_rows_count = mysqli_query($conn, $query)
        or die('Error: '.mysqli_error($conn)); 

    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    print json_encode(array(
        'total_rows' => $total_rows_count
    ));
