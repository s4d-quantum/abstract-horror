<?php include '../../../db_config.php';  ?>
<?php

    $customer = isset($_POST['customer']) && $_POST['customer'] != '' ? $customer = $_POST['customer']:NULL;
    $supplier = isset($_POST['supplier']) && $_POST['supplier'] != '' ? $supplier = $_POST['supplier']:NULL;
    $category = isset($_POST['category']) && $_POST['category'] != '' ? $category = $_POST['category']:NULL;
    $color = isset($_POST['color']) && $_POST['color'] != '' ? $color = $_POST['color']:NULL;
    $grade = isset($_POST['grade']) && $_POST['grade'] != '' ? $grade = $_POST['grade']:NULL;
    $gb = isset($_POST['gb']) && $_POST['gb'] != '' ? $gb = $_POST['gb']:NULL;
    $model = isset($_POST['searchMODEL']) && $_POST['searchMODEL'] != '' ? $searchMODEL = $_POST['searchMODEL']:NULL;
    $tray = isset($_POST['tray']) && $_POST['tray'] != '' ? $tray = $_POST['tray']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate'] != '' ? $fromDate = str_replace("/", "-", $_POST['fromDate']):NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate'] != '' ? $toDate = str_replace("/", "-", $_POST['toDate']):NULL;
    $stockType = $_POST['stockType'];


    // BASIC QUERY
    $query = "
        select 
        distinct pr.purchase_id,
        
        pr.item_imei,
        pr.purchase_return,
        pr.tray_id,
        pr.supplier_id,
        pr.qc_required,
        pr.qc_completed,
        
        im.id,
        im.item_color,
        im.item_gb,
        im.item_grade,
        im.status,
        ";
        // IF CUSTOMER
        $query .= !is_null($customer) ? "ord.customer_id," : "";

        $query .= "
        tc.item_details,
        tc.item_tac,
        tc.item_brand

        from tbl_imei as im

        inner join tbl_tac as tc on 
        im.item_tac = tc.item_tac 

        inner join tbl_purchases as pr 
        on im.item_imei = pr.item_imei ";

        // IF CUSTOMER
        $query .= !is_null($customer) ? " 
        inner join tbl_orders as ord 
        on ord.item_imei = im.item_imei" : "";

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($supplier) || 
            !is_null($customer) || 
            !is_null($category) || 
            !is_null($color) || 
            !is_null($grade) || 
            !is_null($gb) || 
            !is_null($model) || 
            !is_null($tray) || 
            $stockType === 'instock' || 
            $stockType === 'all' ) ? " where ":"";

        // IF STOCK TYPE
        $query .= $stockType === 'instock' ? " im.status = 1 AND pr.purchase_return = 0 ":" (im.status = 0 OR pr.purchase_return = 1) ";

        // IF SUPPLIER
        $query .= !is_null($supplier) ? " AND pr.supplier_id ='".$supplier."'" : "";

        // IF CUSTOMER
        $query .= !is_null($customer) ? " AND ord.customer_id ='".$customer."' AND ord.order_return = 0 " : "";

        // IF CATEGORY  
        $query .= !is_null($category) ? " AND tc.item_brand ='".$category."'" : "";

        // IF COLOR 
        $query .= !is_null($color) ? " AND im.item_color ='".$color."'" : "";

        // IF GRADE 
        $query .= !is_null($grade) ? " AND im.item_grade ='".$grade."'" : "";

        // IF FROM DATE 
        $query .= !is_null($fromDate) ? " AND pr.date >= '".$fromDate."'" : "";

        // IF TO DATE 
        $query .= !is_null($toDate) ? " AND pr.date <='".$toDate."'" : "";

        // IF GB 
        $query .= !is_null($gb) ? " AND im.item_gb ='".$gb."'" : "";

        // IF TRAY 
        $query .= !is_null($tray) ? " AND pr.tray_id ='".$tray."'" : "";

        // IF MODEL
        // if there is # in last of model string then change the query
        $len = strlen($model);
        $hashindex = strpos($model,'#');
        if($hashindex === $len - 1){
            $model = str_replace('#','',$model);
            $query .= !is_null($model) ? " AND tc.item_details LIKE '%".$model."'" : "";
        }
        else{
            $query .= !is_null($model) ? " AND tc.item_details LIKE '%".$model."%'" : "";
        }

        $fetch_items = mysqli_query($conn,
        $query." ORDER BY im.id DESC")
        or die('Error: '.mysqli_error($conn)); 

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        "data" => $results_array
        // "data" => $query
    ));
