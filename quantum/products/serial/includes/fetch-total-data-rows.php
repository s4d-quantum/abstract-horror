<?php include '../../../db_config.php';  ?>
<?php

    if(isset($_POST['searchSERIAL'])){
        $query =  
        "select 
        count(distinct pr.purchase_id) as total

        from tbl_serial_products as pro

        inner join tbl_serial_purchases as pr 
        on pro.item_code = pr.item_code 
        
        where 
        pro.item_code = '".$_POST['searchSERIAL']."'";

    }


    else{

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
        count(pro.item_code) as total,
        ";

        // IF CUSTOMER
        $query .= (!is_null($customer)) ? "ord.customer_id," : "";

        $query .= "
        pro.item_details,
        pro.item_brand

        from tbl_serial_products as pro

        inner join tbl_serial_purchases as pr 
        on pro.item_code = pr.item_code ";

        // IF CUSTOMER
        $query .= (!is_null($customer)) ? " 
        inner join tbl_serial_orders as ord 
        on ord.item_code = pro.item_code" : "";

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
        $query .= $stockType === 'instock' ? " pro.status = 1 AND pr.purchase_return = 0 ":"";

        // IF SUPPLIER
        $query .= $stockType === 'instock' && !is_null($supplier)? " AND ":"";
        $query .= !is_null($supplier) ? " pr.supplier_id ='".$supplier."'" : "";

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
        $query .= !is_null($category) ? " pro.item_brand ='".$category."'" : "";

        // IF GRADE 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category)) && 
            !is_null($grade) ? " AND ":"";
        $query .= !is_null($grade) ? " pro.item_grade ='".$grade."'" : "";

        // IF TRAY 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category) ||
            !is_null($grade)) &&
            !is_null($tray) ? " AND ":"";
        $query .= !is_null($tray) ? " pr.tray_id ='".$tray."'" : "";

        // IF FROM DATE 
        $query .= (
            $stockType === 'instock' || 
            !is_null($customer) || 
            !is_null($supplier) || 
            !is_null($category) || 
            !is_null($grade) || 
            !is_null($tray)) &&
            !is_null($fromDate) ? " AND ":"";
        $query .= !is_null($fromDate) ? " pr.date >= '".$fromDate."'" : "";

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
        $query .= !is_null($toDate) ? " pr.date <='".$toDate."'" : "";

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
            $query .= !is_null($model) ? " pro.item_details LIKE '%".$model."'" : "";
        }
        else{
            $query .= !is_null($model) ? " pro.item_details LIKE '%".$model."%'" : "";
        }
    }

    $fetch_items = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_items)['total'];

    print json_encode($total_rows_count);


    // select 
    // count(pro.item_code) as total,
    // pro.item_details,
    // pro.item_tac,
    // pro.item_brand

    // from tbl_serial_products as pro

    // inner join tbl_tac as tc on 
    // pro.item_tac = pro.item_tac 

    // inner join tbl_serial_purchases as pr 
    // on pro.item_code = pr.item_code

    // inner join tbl_serial_orders as ord 
    // on ord.item_code = pro.item_code

    // where 

    // pro.status = 1 AND pr.purchase_return = 0
    
    // AND 

    // pr.supplier_id ='$supplier' 
    
    // AND 

    // ord.customer_id = '$customer' AND ord.order_return = 0 
    
    // AND 
    
    // pro.item_brand = '$category'
