<?php include '../../../db_config.php';  ?>
<?php

$item_code = $_POST['item_code'];

// check if qc required
$check_qc = mysqli_query($conn,"select 
qc_required from 

tbl_serial_purchases  

where item_code='".$item_code."' AND 
purchase_return = 0")
or die('Error:: ' . mysqli_error($conn));
$check_qc_value = mysqli_fetch_assoc($check_qc);

// if qc is required
if($check_qc_value['qc_required'] == 1){
    $fetch_data = mysqli_query($conn,"select 
    
    pr.item_code,
    pr.status,
    pr.item_details,
    pr.item_grade as grade,
    pr.item_brand,

    pu.purchase_id,
    pu.date,
    pu.qc_required,
    pu.qc_completed,
    pu.purchase_return,
    pu.tray_id,
    
    ct.title,

    it.item_comments,
    it.item_cosmetic_passed,
    it.item_functional_passed,
    it.item_flashed
    
    from tbl_serial_products as pr

    inner join tbl_categories as ct 
    on ct.category_id = pr.item_brand 
    
    inner join tbl_qc_serial_products as it 
    on it.item_code = pr.item_code
    
    inner join tbl_serial_purchases as pu 
    on pu.item_code = pr.item_code
    
    where pu.item_code='".$item_code."' AND 
    
    pr.status = 1 AND 
    it.item_cosmetic_passed = 1 AND 
    it.item_functional_passed = 1 AND 
    pu.qc_completed = 1 AND 
    pu.purchase_return = 0");
    
    $row = mysqli_fetch_assoc($fetch_data);
    print json_encode($row);
    
}
// if qc not required
else{

    $fetch_data = mysqli_query($conn,"select
    pr.item_code,
    pr.item_details,
    pr.item_grade as grade,
    pr.item_brand,

    pu.purchase_id,
    pu.qc_required,
    pu.tray_id,
    
    ct.title

    from tbl_serial_products as pr 
    
    inner join tbl_categories as ct 
    on ct.category_id = pr.item_brand  
        
    inner join tbl_serial_purchases as pu 
    on pu.item_code = pr.item_code
    
    where pu.item_code='".$item_code."' AND 
    
    pr.status = 1 AND 
    pu.qc_required=0 AND 
    pu.purchase_return = 0 
    ");
    
    $row = mysqli_fetch_assoc($fetch_data);
    print json_encode($row);
}
