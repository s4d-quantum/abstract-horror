<?php include '../../../db_config.php';  ?>
<?php


    $customer = isset($_POST['customer']) && $_POST['customer'] != '' ? $customer = $_POST['customer']:NULL;
    $supplier = isset($_POST['supplier']) && $_POST['supplier'] != '' ? $supplier = $_POST['supplier']:NULL;
    $category = isset($_POST['category']) && $_POST['category'] != '' ? $category = $_POST['category']:NULL;
    $grade = isset($_POST['grade']) && $_POST['grade'] != '' ? $grade = $_POST['grade']:NULL;
    $tray = isset($_POST['tray']) && $_POST['tray'] != '' ? $tray = $_POST['tray']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate'] != '' ? $fromDate = str_replace("/", "-", $_POST['fromDate']):NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate'] != '' ? $toDate = str_replace("/", "-", $_POST['toDate']):NULL;
    $model = isset($_POST['searchMODEL']) && $_POST['searchMODEL'] != '' ? $searchMODEL = $_POST['searchMODEL']:NULL;
    $stockType = $_POST['stockType'];


    // BASIC QUERY
    $query = "
        select 
        distinct pu.purchase_id,
        
        pu.item_code,
        pu.purchase_return,
        pu.tray_id,
        pu.supplier_id,
        pu.qc_required,
        pu.qc_completed,
        
        pr.id,
        pr.item_grade,
        pr.status,
        ";
        // IF CUSTOMER
        $query .= (!is_null($customer)) ? "ord.customer_id," : "";

        $query .= "
        pr.item_details,
        pr.item_brand

        from tbl_serial_products as pr

        inner join tbl_serial_purchases as pu 
        on pr.item_code = pu.item_code ";

        // IF CUSTOMER
        $query .= (!is_null($customer)) ? " 
        inner join tbl_serial_orders as ord 
        on ord.item_code = pr.item_code" : "";

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($supplier) || 
            !is_null($customer) || 
            !is_null($category) || 
            !is_null($grade) || 
            !is_null($tray) || 
            !is_null($model) || 
            $stockType === 'instock') ? " where ":"";

        // IF STOCK TYPE
        $query .= $stockType === 'instock' ? " pr.status = 1 AND pu.purchase_return = 0 ":"";

        // IF SUPPLIER
        $query .= $stockType === 'instock' && !is_null($supplier)? " AND ":"";
        $query .= !is_null($supplier) ? " pu.supplier_id ='".$supplier."'" : "";

        // IF CUSTOMER
        $query .= (
            $stockType === 'instock' || 
            !is_null($supplier)) && 
            !is_null($customer) ? " AND ":"";
        $query .= !is_null($customer) ? " ord.customer_id ='".$customer."' AND ord.order_return = 0 " : "";

        // IF CATEGORY  
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier)) && 
            !is_null($category) ? " AND ":"";
        $query .= !is_null($category) ? " pr.item_brand ='".$category."'" : "";

        // IF GRADE 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category)) && 
            !is_null($grade) ? " AND ":"";
        $query .= !is_null($grade) ? " pr.item_grade ='".$grade."'" : "";

        // IF TRAY 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category) || 
            !is_null($grade)) &&
            !is_null($tray) ? " AND ":"";
        $query .= !is_null($tray) ? " pu.tray_id ='".$tray."'" : "";

        // IF FROM DATE 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category) || 
            !is_null($grade) || 
            !is_null($tray)) &&
            !is_null($fromDate) ? " AND ":"";
        $query .= !is_null($fromDate) ? " pu.date >= '".$fromDate."'" : "";

        // IF FROM DATE 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category) || 
            !is_null($grade) || 
            !is_null($tray) || 
            !is_null($fromDate)) &&
            !is_null($toDate) ? " AND ":"";
        $query .= !is_null($toDate) ? " pu.date <='".$toDate."'" : "";

        // IF MODEL
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category) ||
            !is_null($grade) || 
            !is_null($tray) || 
            !is_null($fromDate) || 
            !is_null($toDate)) &&
            !is_null($model) ? " AND ":"";


        // if there is # in last of model string then change the query
        $len = strlen($model);
        $hashindex = strpos($model,'#');
        if($hashindex === $len - 1){
            $model = str_replace('#','',$model);
            $query .= !is_null($model) ? " pr.item_details LIKE '%".$model."'" : "";
        }
        else{
            $query .= !is_null($model) ? " pr.item_details LIKE '%".$model."%'" : "";
        }

        $fetch_items = mysqli_query($conn,
        $query." ORDER BY pr.id DESC")
        or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        "data" => $results_array
        // "data" => $query
    ));
