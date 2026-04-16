<?php include '../../../db_config.php';  ?>
<?php

    if(isset($_POST['pageId'])){
        $pageId = ($_POST['pageId'] > 1 ) ? (($_POST['pageId'] -1) * 10 ) : 0;
    }

    $customer = isset($_POST['customer']) && $_POST['customer'] != '' ? $customer = $_POST['customer']:NULL;
    $supplier = isset($_POST['supplier']) && $_POST['supplier'] != '' ? $supplier = $_POST['supplier']:NULL;
    $category = isset($_POST['category']) && $_POST['category'] != '' ? $category = $_POST['category']:NULL;
    $tray = isset($_POST['tray']) && $_POST['tray'] != '' ? $tray = $_POST['tray']:NULL;
    $fromDate = isset($_POST['fromDate']) && $_POST['fromDate'] != '' ? $fromDate = str_replace("/", "-", $_POST['fromDate']):NULL;
    $toDate = isset($_POST['toDate']) && $_POST['toDate'] != '' ? $toDate = str_replace("/", "-", $_POST['toDate']):NULL;
    $stockType = $_POST['stockType'];


    // BASIC QUERY
    $query = "
        select 
        
        pro.item_qty,

        pro.item_brand,
        pro.item_color,

        pro.id as item_code,
        pro.title as product_title"." ";


        // IF CUSTOMER  
        $query .= !is_null($customer) ? ",ord.customer_id " : "";

        $query .= " from tbl_parts_products as pro 
        inner join tbl_parts_purchases as pr on pro.id = pr.product_id "." ";

            $query .= (
                !is_null($customer) ) ? "inner join tbl_parts_orders as ord on pro.id = ord.product_id ":"";

                // USE WHERE CLAUSE ONLY WHEN CONDITION 
        $query .= (
            !is_null($supplier) || 
            !is_null($customer) || 
            !is_null($category) || 
            !is_null($fromDate) || 
            !is_null($toDate) || 
            !is_null($tray) ) ? " where char_length(pro.item_tac) > 0 AND pr.item_qty >= 0":" where char_length(pro.item_tac) > 0";

        // IF SUPPLIER
        $query .= !is_null($supplier) ? " AND pr.supplier_id ='".$supplier."'" : "";

        // IF CATEGORY  
        $query .= !is_null($category) ? " AND pro.item_brand ='".$category."'" : "";

        // IF FROM DATE 
        $query .= !is_null($fromDate) ? " AND pr.date >= '".$fromDate."'" : "";

        // IF TO DATE 
        $query .= !is_null($toDate) ? " AND pr.date <='".$toDate."'" : "";

        // IF TRAY 
        $query .= !is_null($tray) ? " AND pr.tray_id ='".$tray."'" : "";
        

    if(isset($_POST['searchItemCode'])){

        $fetch_items = mysqli_query($conn, 
        "
        select 
 
        pro.item_qty,
        
        pro.id as item_code,
        pro.item_brand,
        pro.item_color,
        pro.title as product_title

        from tbl_parts_products as pro
        inner join tbl_parts_purchases as pr on pro.id = pr.product_id
       
        where 
        pro.title LIKE '%".$_POST['searchItemCode']."%' GROUP BY pro.id")
        or die('Error: '.mysqli_error($conn)); 

    }
    else{
        $fetch_items = mysqli_query($conn,
        $query." GROUP BY pro.id ORDER BY pro.id DESC

        LIMIT 10 OFFSET ".$pageId)
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
