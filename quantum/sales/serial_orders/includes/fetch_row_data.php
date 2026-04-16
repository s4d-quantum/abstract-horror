 <?php include '../../../db_config.php';  ?>
<?php

    $supplier = $_POST['supplier'];
    $category = $_POST['category'];
    // $model = $_POST['model'];

    // BASIC QUERY
    $query = "
    
    select 
    prd.item_code,
    prd.item_grade, 
    prd.item_details, 
    prd.item_brand,
    pr.tray_id,
    pr.supplier_id 

    from tbl_serial_products as prd 

    left join tbl_serial_purchases as pr on pr.item_code = prd.item_code 

    WHERE
    NOT EXISTS(select item_code from tbl_serial_sales_orders where 
    item_code = prd.item_code AND is_completed = 0) AND

    prd.item_brand = '".$category."' AND 
    pr.supplier_id='".$supplier."' AND 
    pr.purchase_return=0 AND

    prd.status = 1 AND    
        
    (
    pr.qc_required=0 AND pr.qc_completed=0 OR
    pr.qc_required=1 AND pr.qc_completed=1 AND 

    EXISTS(select item_code from tbl_qc_serial_products where 
    item_cosmetic_passed = 1 AND item_functional_passed = 1 AND 
    item_code = prd.item_code AND purchase_id = pr.purchase_id) 
    
    )";

    $fetch_purchase = mysqli_query($conn,$query)
    or die('Error: '.mysqli_error($conn)); 


    // // SALES ORDER QUERY
    // $sales_order_item_query = "select 
    //     item_code 

    //     from tbl_imei_sales_orders as SORD 
        
    //     where

    //     item_code = '".$item_code."'";
    
    //     $fetch_purchase = mysqli_query($conn,$query)
    //     or die('Error: '.mysqli_error($conn)); 
    

    $results_array = array();
    while ($row = mysqli_fetch_assoc($fetch_purchase)) {
        $results_array[] = $row;
    }

    print json_encode($results_array);   