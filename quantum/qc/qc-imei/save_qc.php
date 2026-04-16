<?php include '../../db_config.php';  ?>
<?php

$date = date('Y-m-d');

// echo $date;
// die();

if(isset($_POST['item_code'])){

  for($i=0; $i<count($_POST['item_code']); $i++){

    $check_query = mysqli_query($conn,"select count(distinct id) as id from 
    tbl_qc_imei_products where item_code='".$_POST['item_code'][$i]."' 
    AND purchase_id=".$_POST['purchase_id'])
    or die('Error:: ' . mysqli_error($conn));
    $check = mysqli_fetch_assoc($check_query);
  
    // if items already in QC
    if($check['id'] > 0){
  
      // update qc products details
      $update_query = mysqli_query($conn,"update tbl_qc_imei_products 
      set 
      item_comments ='".$_POST['item_comments'][$i]."',
      item_eu ='".$_POST['item_eu'][$i]."',
      item_flashed =".$_POST['item_flashed'][$i].",
      item_cosmetic_passed =".$_POST['item_cosmetic_passed'][$i].",
      item_functional_passed =".$_POST['item_functional_passed'][$i]."
      where item_code ='".$_POST['item_code'][$i]."' AND 
      purchase_id=".$_POST['purchase_id'])
      or die('Error:: ' . mysqli_error($conn));
  
  
    }
    // items newly already in DB
    else{
      // update qc products details
      $insert_query = mysqli_query($conn,"insert into tbl_qc_imei_products 
      (
      item_comments, 
      item_eu, 
      item_flashed, 
      item_cosmetic_passed, 
      item_functional_passed, 
      item_code, 
      purchase_id,
      user_id) values 
      (
        '".$_POST['item_comments'][$i]."',
        '".$_POST['item_eu'][$i]."',
        ".$_POST['item_flashed'][$i].",
        ".$_POST['item_cosmetic_passed'][$i].",
        ".$_POST['item_functional_passed'][$i].",
        '".$_POST['item_code'][$i]."',
        ".$_POST['purchase_id'].",
        ".$_POST['user_id']."
      )")
      or die('Error:: ' . mysqli_error($conn));
  
    }//else ended

    
    // UPDATE GRADE / COLOR IN IMEI
    $gradeValue = intval($_POST['item_grade'][$i]);
    $colorClause = "";
    if(isset($_POST['item_color'][$i])){
      $colorValue = trim($_POST['item_color'][$i]);
      $escapedColor = mysqli_real_escape_string($conn, $colorValue);
      $colorClause = ", item_color ='".$escapedColor."'";
    }
    $update_grade = mysqli_query($conn,"update tbl_imei set 
    item_grade =".$gradeValue.$colorClause." 
    where item_imei='".$_POST['item_code'][$i]."'")
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
    'IP-".$_POST['purchase_id']."',
    'IMEI QC UPDATED',
    '".$_POST['item_comments'][$i]."',
    '".$date."',
    ".$_POST['user_id'].",
    '".$_POST['item_code'][$i]."'
    )")
    or die('Error:: ' . mysqli_error($conn));
    
  }//FOR LOOP ENDED
  
}

//Complete qc
$is_completed = $_POST['qc_completed'] === 'true' ?1:0;
$complete_query = mysqli_query($conn,"update tbl_purchases set 
qc_completed = ".$is_completed." 
where purchase_id=".$_POST['purchase_id'])
or die('Error:: ' . mysqli_error($conn));


print_r($_POST['item_code']);
// echo 'QC success';
