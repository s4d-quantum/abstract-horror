    <?php include '../../../db_config.php';  ?>
    <?php


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
    
    pr.purchase_id,
    pr.supplier_id,
    pr.tray_id,
    pr.item_qty as purchase_qty,
    
    pro.item_qty,
    pro.item_brand,
    pro.id as item_code,
    pro.title as product_title"." ";


    // IF CUSTOMER  
    $query .= !is_null($customer) ? ",ord.customer_id " : "";

    $query .= " from tbl_accessories_products as pro 
    inner join tbl_accessories_purchases as pr on pro.id = pr.product_id "." ";

    $query .= (
        !is_null($customer) ) ? "inner join tbl_accessories_orders as ord on pro.id = ord.product_id ":"";

    // USE WHERE CLAUSE ONLY WHEN CONDITION 
    $query .= (
        !is_null($supplier) || 
        !is_null($customer) || 
        !is_null($category) || 
        !is_null($fromDate) || 
        !is_null($toDate) || 
        !is_null($tray) ) ? " where pro.item_qty >= 0":"";

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

        pr.item_qty,
        pr.purchase_id,
        pr.supplier_id,
        pr.tray_id,
        
        pro.id as item_code,
        pro.item_brand,
        pro.title as product_title 
    
        from tbl_accessories_products as pro

        where 
        pro.title LIKE '%".$_POST['searchItemCode']."%'")
        or die('Error: '.mysqli_error($conn)); 

    }
    else{
        $fetch_items = mysqli_query($conn,
        $query." ORDER BY pro.id DESC")
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