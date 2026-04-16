<?php include '../../../db_config.php';  ?>
<?php

    $fetch_total_rows_count = mysqli_query($conn, "select count(distinct purchase_id) as total 
    from tbl_serial_purchases")
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_total_rows_count)['total'];

    // Variables 
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput']:NULL;
    $supplier = isset($_POST['searchSupplier']) && $_POST['searchSupplier']  != '' ?  $_POST['searchSupplier']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate']  != '' ?  $_POST['fromDate']:NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate']  != '' ?  $_POST['toDate']:NULL;

    if(isset($_POST['pageId'])){
        $pageId = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;
    }

    $query = "
        select 
        distinct pr.purchase_id,
        pr.date,
        pr.qc_required,
        pr.priority,
        sup.name as supplier,
        (select count(purchase_id) from 
        tbl_serial_purchases where purchase_id = pr.purchase_id) as total, 
        (Select max(purchase_return) from tbl_serial_purchases where purchase_id=pr.purchase_id
        ) as purchase_return,
        pr.has_return_tag

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

        $query .= " ORDER BY pr.purchase_id DESC LIMIT 10 OFFSET ".$pageId;


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
