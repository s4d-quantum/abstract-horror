<?php include '../../../db_config.php';  ?>
<?php

    if(isset($_POST['pageId'])){
        $pageId = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;
    }

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
        SELECT
        MAX(i.id) as id,
        i.item_imei,
        MAX(i.item_tac) as item_tac,
        MAX(i.item_color) as item_color,
        MAX(i.oem_color) as oem_color,
        MAX(i.item_gb) as item_gb,
        MAX(i.item_grade) as item_grade,
        MAX(i.status) as status,
        pr.tray_id as location,
        pr.purchase_id,
        pr.item_imei as pr_item_imei,
        pr.purchase_return,
        pr.tray_id as pr_tray_id,
        pr.supplier_id,
        pr.qc_required,
        pr.qc_completed,
        qc.item_comments,
        qc.item_cosmetic_passed,
        qc.item_functional_passed,
        (SELECT order_id FROM tbl_imei_sales_orders
         WHERE item_code = i.item_imei AND is_completed = 0
         LIMIT 1) as reserved_order_id,
        ";

        // IF STATUS SOLD
        if(!is_null($customer) || $stockType === 'sold'){
            $query .= "ord.customer_id, ord.po_box, ";
        }

        $query .= "
        MAX(tc.item_details) as item_details,
        MAX(tc.item_tac) as tc_item_tac,
        MAX(tc.item_brand) as item_brand

        FROM tbl_imei i

        INNER JOIN tbl_tac as tc on
        i.item_tac = tc.item_tac

        INNER JOIN tbl_purchases as pr
        ON i.item_imei = pr.item_imei
        AND pr.purchase_id = (
            SELECT MAX(pr2.purchase_id)
            FROM tbl_purchases pr2
            WHERE pr2.item_imei = i.item_imei
        )

        LEFT OUTER JOIN tbl_qc_imei_products as qc on
        pr.purchase_id = qc.purchase_id AND pr.item_imei = qc.item_code ";

        // IF CUSTOMER
        if(!is_null($customer) || $stockType === 'sold'){
            $query .= " INNER JOIN tbl_orders as ord
            ON ord.item_imei = i.item_imei ";
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
            $stockType === 'all' ) ? " WHERE ":"";

        // IF STOCK TYPE
        $status_condition = "";
        if ($stockType === 'instock') {
            $status_condition = " i.status = 1 AND pr.purchase_return = 0 ";
        } elseif ($stockType === 'sold') {
            $status_condition = " (i.status = 0 OR i.status = 1) ";
        } else {
            $status_condition = " (i.status = 0 OR i.status = 1) ";
        }
        $query .= $status_condition;

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
        $query .= !is_null($color) ? " AND i.item_color ='".$color."'" : "";

        // IF OEM COLOR
        $query .= !is_null($oemColor) ? " AND i.oem_color ='".$oemColor."'" : "";

        // IF GRADE
        $query .= !is_null($grade) ? " AND i.item_grade = ".intval($grade) : "";

        // IF FROM DATE
        $date_field = ($stockType === 'sold') ? 'ord.date' : 'pr.date';
        $query .= !is_null($fromDate) ? " AND DATE($date_field) >= '".$fromDate."'" : "";

        // IF TO DATE
        $query .= !is_null($toDate) ? " AND DATE($date_field) <= '".$toDate."'" : "";

        // IF GB 
        $query .= !is_null($gb) ? " AND i.item_gb ='".$gb."'" : "";

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
        
    if(isset($_POST['searchIMEI'])){
        $fetch_items = mysqli_query($conn,
        "SELECT
        i.*,
        pr.tray_id as location,
        pr.purchase_id,
        pr.item_imei,
        pr.purchase_return,
        pr.tray_id,
        pr.supplier_id,
        pr.qc_required,
        pr.qc_completed,
        qc.item_comments,
        qc.item_cosmetic_passed,
        qc.item_functional_passed,
        i.id,
        i.item_color,
        i.item_gb,
        i.item_grade,
        i.status,
        tc.item_details,
        tc.item_tac,
        tc.item_brand

        FROM tbl_imei i

        INNER JOIN tbl_tac as tc on
        i.item_tac = tc.item_tac

        INNER JOIN tbl_purchases as pr
        ON i.item_imei = pr.item_imei
        AND pr.purchase_id = (
            SELECT MAX(pr2.purchase_id)
            FROM tbl_purchases pr2
            WHERE pr2.item_imei = i.item_imei
        )

        LEFT OUTER JOIN tbl_qc_imei_products as qc on
        pr.purchase_id = qc.purchase_id AND pr.item_imei = qc.item_code

        WHERE i.item_imei = '".$_POST['searchIMEI']."'")
        or die('Error: '.mysqli_error($conn));
    }
    else{
        $fetch_items = mysqli_query($conn,
        $query." GROUP BY i.item_imei ORDER BY i.id DESC LIMIT 10 OFFSET ".$pageId)
        or die('Error: '.mysqli_error($conn));
    }

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_items)) {
        $results_array[] = $row;
    }

    print json_encode(array(
        "data" => $results_array
    ));
