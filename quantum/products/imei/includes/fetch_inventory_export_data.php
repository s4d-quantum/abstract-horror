<?php include '../../../db_config.php';  ?>
<?php

    $customer = isset($_POST['customer']) && $_POST['customer'] != '' ? $customer = $_POST['customer']:NULL;
    $supplier = isset($_POST['supplier']) && $_POST['supplier'] != '' ? $supplier = $_POST['supplier']:NULL;
    $category = isset($_POST['category']) && $_POST['category'] != '' ? $category = $_POST['category']:NULL;
    $color = isset($_POST['color']) && $_POST['color'] != '' ? $color = trim($_POST['color']):NULL;
    $oemColor = isset($_POST['oemColor']) && $_POST['oemColor'] != '' ? $oemColor = trim($_POST['oemColor']):NULL;
    $grade = isset($_POST['grade']) && $_POST['grade'] != '' ? $grade = $_POST['grade']:NULL;
    $gb = isset($_POST['gb']) && $_POST['gb'] != '' ? $gb = $_POST['gb']:NULL;
    $model = isset($_POST['searchMODEL']) && $_POST['searchMODEL'] != '' ? $searchMODEL = $_POST['searchMODEL']:NULL;
    $tray = isset($_POST['tray']) && $_POST['tray'] != '' ? $tray = $_POST['tray']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate'] != '' ? $fromDate = str_replace("/", "-", $_POST['fromDate']):NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate'] != '' ? $toDate = str_replace("/", "-", $_POST['toDate']):NULL;
    $isQcDone = isset($_POST['isQcDone']) && $_POST['isQcDone'] != '' ? $isQcDone = str_replace("/", "-", $_POST['isQcDone']):NULL;
    $isQcPassed = isset($_POST['isQcPassed']) && $_POST['isQcPassed'] != '' ? $isQcPassed = str_replace("/", "-", $_POST['isQcPassed']):NULL;
    $stockType = $_POST['stockType'];


    // BASIC QUERY
    $query = "
        select 
        distinct pr.purchase_id,
        
        pr.item_imei,
        pr.tray_id,
        pr.supplier_id,
        
        pr.qc_required,
        pr.qc_completed,        

        qc.item_comments, 
        qc.item_cosmetic_passed,
        qc.item_functional_passed,

        im.item_color,
        im.oem_color,
        im.item_gb,
        im.item_grade,
        im.status,
        ";
        // IF CUSTOMER
        if(!is_null($customer) || $stockType === 'sold'){
            $query .= "ord.customer_id, ord.po_box, ";
        }
    
        $query .= "
        tc.item_details,
        tc.item_brand

        from tbl_imei as im

        inner join tbl_tac as tc on 
        im.item_tac = tc.item_tac 

        inner join tbl_purchases as pr 
        on im.item_imei = pr.item_imei 
        
        LEFT OUTER join tbl_qc_imei_products as qc on 
        pr.purchase_id = qc.purchase_id AND pr.item_imei = qc.item_code ";

        // IF CUSTOMER
        if(!is_null($customer) || $stockType === 'sold'){
            $query .= " inner join tbl_orders as ord 
            on ord.item_imei = im.item_imei";
        }

        // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($supplier) || 
            !is_null($customer) || 
            !is_null($category) || 
            !is_null($color) || 
            !is_null($oemColor) || 
            !is_null($grade) || 
            !is_null($gb) || 
            !is_null($model) || 
            !is_null($tray) || 
            !is_null($toDate) || 
            !is_null($fromDate) || 
            !is_null($isQcDone) || 
            !is_null($isQcPassed) || 
            $stockType === 'instock' || 
            $stockType === 'sold' || 
            $stockType === 'all' ) ? " where ":"";

        // IF STOCK TYPE
        $query .= $stockType === 'instock' ? " im.status = 1 AND pr.purchase_return = 0 ":" (im.status = 0 OR im.status = 1) ";

        // IF SUPPLIER
        $query .= !is_null($supplier) ? " AND pr.supplier_id ='".$supplier."'" : "";

        // IF CUSTOMER SELECTED 
        if(!is_null($customer)){
            $query .= " AND ord.customer_id ='".$customer."' AND ord.order_return = 0 ";
        }
        // IF CUSTOMER NOT SELECTED
        if(is_null($customer) && $stockType === 'sold'){
            $query .= " AND ord.order_return = 0 ";
        }

        // IF CATEGORY  
        $query .= !is_null($category) ? " AND tc.item_brand ='".$category."'" : "";

        // IF COLOR 
        $query .= !is_null($color) ? " AND im.item_color ='".$color."'" : "";

        // IF OEM COLOR 
        $query .= !is_null($oemColor) ? " AND im.oem_color ='".$oemColor."'" : "";

        // IF GRADE
        $query .= !is_null($grade) ? " AND im.item_grade = ".intval($grade) : "";

        // IF FROM DATE
        $date_field = ($stockType === 'sold') ? 'ord.date' : 'pr.date';
        $query .= !is_null($fromDate) ? " AND DATE($date_field) >= '".$fromDate."'" : "";

        // IF TO DATE
        $query .= !is_null($toDate) ? " AND DATE($date_field) <= '".$toDate."'" : "";

        // IF GB 
        $query .= !is_null($gb) ? " AND im.item_gb ='".$gb."'" : "";

        // IF TRAY 
        $query .= !is_null($tray) ? " AND pr.tray_id ='".$tray."'" : "";

        // IF QC COMPLETED 
        $query .= !is_null($isQcDone) ? " AND pr.qc_completed =".$isQcDone : "";

        // IF QC PASSED STARTED--------
        $query .= !is_null($isQcPassed) && $isQcPassed === '1' ? " AND qc.item_cosmetic_passed= 1 AND qc.item_functional_passed=1" : "";

        // === OR === 

        $query .= !is_null($isQcPassed) && $isQcPassed === '0' ? " AND (qc.item_cosmetic_passed= 0 OR qc.item_functional_passed=0)" : "";
        // -------- IF QC PASSED ENDED

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

    // print json_encode(array(
    //     // "data" => $results_array
    //     "data" => $query
    // ));

    // die();
        
    if(isset($_POST['searchIMEI'])){

        $fetch_items = mysqli_query($conn, 
        "select 
        distinct pr.purchase_id,
        
        pr.item_imei,
        pr.tray_id,
        pr.supplier_id,
        
        pr.qc_required,
        pr.qc_completed,        

        qc.item_comments, 
        qc.item_cosmetic_passed,
        qc.item_functional_passed,

        im.item_color,
        im.oem_color,
        im.item_gb,
        im.item_grade,
        im.status,

        tc.item_details,
        tc.item_brand

        from tbl_imei as im

        inner join tbl_tac as tc on 
        im.item_tac = tc.item_tac 

        inner join tbl_purchases as pr 
        on im.item_imei = pr.item_imei 
        
        where 
        im.item_imei = '".$_POST['searchIMEI']."'")
        or die('Error: '.mysqli_error($conn)); 

    }
    else{
        $fetch_items = mysqli_query($conn,
        $query." ORDER BY im.id DESC")
        or die('Error: '.mysqli_error($conn)); 
    }

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        "data" => $results_array,
        "query" => $query
    ));

    // In the mappedData export functionality: guard against missing helper functions
    if (function_exists('findBrand')) {
        $mappedData = array_map(function($row) {
            return array(
                'PID' => $row['purchase_id'],
                'IMEI' => $row['item_imei'],
                'Brand' => findBrand($row['item_brand']),
                'Supplier' => findSupplier($row['supplier_id']),
                'Location' => isset($row['location']) ? $row['location'] : "Not Set",
                'Color' => $row['item_color'],
                'GB' => $row['item_gb'],
                'Grade' => findGrade($row['item_grade']),
                'Details' => $row['item_details'],
                'Status' => $row['status'] == 1 ? "Available" : "Not Available",
                'Po_Box' => $row['po_box'],
                'Customer' => findCustomer($row['customer_id']),
                'QC_Completed' => $row['qc_required'] 
                    ? ($row['qc_completed'] === "1" ? "COMPLETED" : "INCOMPLETE") 
                    : "NOT REQUIRED",
                'QC_Status' => ($row['item_cosmetic_passed'] === "1" && $row['item_functional_passed'] === "1") 
                    ? "PASSED" 
                    : "FAILED",
                'QC_Comments' => $row['item_comments']
            );
        }, $results_array);
    }
?>
