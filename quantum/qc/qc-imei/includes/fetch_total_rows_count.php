<?php include '../../../db_config.php';  ?>
<?php

    // Variables 
    $searchInput = isset($_POST['searchInput']) && $_POST['searchInput']  != '' ?  $_POST['searchInput']:NULL;
    $supplier = isset($_POST['searchSupplier']) && $_POST['searchSupplier']  != '' ?  $_POST['searchSupplier']:NULL;
    $status = isset($_POST['searchStatus']) && $_POST['searchStatus']  != '' ?  $_POST['searchStatus']:NULL;

    $query = "
        select 
        count(distinct pur.purchase_id) as total

        from tbl_purchases as pur

        inner join tbl_suppliers as sup 
        on pur.supplier_id = sup.supplier_id

        where pur.qc_required=1 ";

    // SEARCH INPUT
    $query .= !is_null($searchInput) ? " AND pur.purchase_id ='".$searchInput."' " : "";

    // SUPPLIER
    $query .= !is_null($supplier) ? " AND pur.supplier_id ='".$supplier."' " : "";

    // STATUS
    $query .= !is_null($status) ? " AND pur.qc_completed =".$status : "";

    $fetch_items = mysqli_query($conn, $query)
    or die('Error: '.mysqli_error($conn)); 

    
    $total_rows_count = mysqli_fetch_assoc($fetch_items)['total'];

    print json_encode(array(
        'total_rows' => $total_rows_count
    ));
