<?php include '../../../db_config.php';  ?>
<?php

    // Variables 
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput']:NULL;
    $supplier = isset($_POST['searchSupplier']) && $_POST['searchSupplier']  != '' ?  $_POST['searchSupplier']:NULL;
    $status = isset($_POST['searchStatus']) && $_POST['searchStatus']  != '' ?  $_POST['searchStatus']:NULL;

    $page_id = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;

    $query = "
        select 
        distinct pur.purchase_id,
        pur.qc_required,
        pur.qc_completed,
        pur.date,
        sup.name as supplier,
        pur.purchase_return,
        pur.tray_id

        from tbl_purchases as pur

        inner join tbl_suppliers as sup 
        on pur.supplier_id = sup.supplier_id

        where pur.qc_required=1 AND 
            (( pur.repair_required=1 AND pur.repair_completed=1) OR ( pur.repair_required=0 AND pur.repair_completed=0)) ";

    // SEARCH INPUT
    $query .= !is_null($searchInput) ? " AND pur.purchase_id ='".$searchInput."' " : "";

    // SUPPLIER
    $query .= !is_null($supplier) ? " AND pur.supplier_id ='".$supplier."' " : "";

    // STATUS
    $query .= !is_null($status) ? " AND pur.qc_completed =".$status : "";

    $query .= " GROUP BY pur.purchase_id

        ORDER BY pur.id DESC

        LIMIT 10 OFFSET ".$page_id;

    $fetch_items = mysqli_query($conn, $query)
    or die('Error: '.mysqli_error($conn)); 

    
    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        // 'total_rows' => $total_rows_count,
        'data' => $results_array
    ));
