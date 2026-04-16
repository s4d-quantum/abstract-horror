<?php include '../../db_config.php';  ?>
<?php

$date = date('Y-m-d');

if(isset($_POST['item_code'])){

  for($i=0; $i<count($_POST['item_code']); $i++){

    $check_query = mysqli_query($conn,"select count(distinct id) as id from 
    tbl_qc_serial_products where item_code='".$_POST['item_code'][$i]."' and 
    purchase_id=".$_POST['purchase_id'])
    or die('Error:: ' . mysqli_error($conn));
    $check = mysqli_fetch_assoc($check_query);

    // if items already in DB
    if($check['id'] > 0){

      // update qc products details
      $update_query = mysqli_query($conn,"update tbl_qc_serial_products 
      set 
      item_comments ='".$_POST['item_comments'][$i]."',
      item_flashed =".$_POST['item_flashed'][$i].",
      item_cosmetic_passed =".$_POST['item_cosmetic_passed'][$i].",
      item_functional_passed =".$_POST['item_functional_passed'][$i]."
      where item_code ='".$_POST['item_code'][$i]."' and purchase_id=".$_POST['purchase_id'])
      or die('Error:: ' . mysqli_error($conn));

    }
    // items newly already in DB
    else{
      // update qc products details
      $insert_query = mysqli_query($conn,"insert into tbl_qc_serial_products 
      (
      item_comments, 
      item_flashed, 
      item_cosmetic_passed, 
      item_functional_passed, 
      item_code, 
      purchase_id,
      user_id) values 
      (
        '".$_POST['item_comments'][$i]."',
        ".$_POST['item_flashed'][$i].",
        ".$_POST['item_cosmetic_passed'][$i].",
        ".$_POST['item_functional_passed'][$i].",
        '".$_POST['item_code'][$i]."',
        ".$_POST['purchase_id'].",
        ".$_POST['user_id']."
      )")
      or die('Error:: ' . mysqli_error($conn));

    }//else ended

        
    // UPDATE GRADE IN IMEI
    $update_grade = mysqli_query($conn,"update tbl_serial_products set 
    item_grade =".$_POST['item_grade'][$i]." 
    where item_code='".$_POST['item_code'][$i]."'")
      or die('Error:: ' . mysqli_error($conn));


    // INPUT LOG EACH ITEM
    $new_log = mysqli_query($conn,"insert into tbl_log (
    ref,
    subject,
    details,
    date, 
    user_id,
    item_code
    )
    values
    (
    'SP-".$_POST['purchase_id']."',
    'SERIAL QC UPDATED',
    '".$_POST['item_comments'][$i]."',
    '".$date."',
    ".$_POST['user_id'].",
    '".$_POST['item_code'][$i]."'
    )")
    or die('Error:: ' . mysqli_error($conn));

  }//for loop ended

}

//Complete qc
$is_completed = $_POST['qc_completed'] === 'true' ?1:0;
$complete_query = mysqli_query($conn,"update tbl_serial_purchases set 
qc_completed = ".$is_completed." 
where purchase_id=".$_POST['purchase_id'])
or die('Error:: ' . mysqli_error($conn));

print_r($_POST['item_code']);
