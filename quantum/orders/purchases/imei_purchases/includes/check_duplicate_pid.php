<?php include '../../../db_config.php';  ?>
<?php

$new_pur_id = $_POST['PID'];

// for multi user
// check if same PID exists in DB already
$checksameid_query = mysqli_query($conn,"select purchase_id from tbl_purchases where 
purchase_id=".$new_pur_id);
$checksameid = mysqli_fetch_assoc($checksameid_query)['purchase_id'];

if(isset($checksameid)){
    echo 1;
}
else{
    echo 0;
}
