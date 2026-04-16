<?php include '../../db_config.php';  ?>
<?php

$date = date('Y-m-d');

// echo $date;
// die();

if(isset($_POST['item_code'])){

  for($i=0; $i<count($_POST['item_code']); $i++){

    $check_query = mysqli_query($conn,"select count(distinct id) as id from 
    tbl_repair_imei_products where item_code='".$_POST['item_code'][$i]."' 
    AND purchase_id=".$_POST['purchase_id'])
    or die('Error:: ' . mysqli_error($conn));
    $check = mysqli_fetch_assoc($check_query);
  
    // if items already in REPAIR
    if($check['id'] > 0){
  
      // update repair products details
      $update_query = mysqli_query($conn,"update tbl_repair_imei_products 
      set 
      item_comments ='".$_POST['item_comments'][$i]."'
      where item_code ='".$_POST['item_code'][$i]."' AND 
      purchase_id=".$_POST['purchase_id'])
      or die('Error:: ' . mysqli_error($conn));
  
  
    }
    // items newly already in DB
    else{
      // update repair products details
      $insert_query = mysqli_query($conn,"insert into tbl_repair_imei_products 
      (
      item_comments, 
      item_code, 
      purchase_id,
      user_id) values 
      (
        '".$_POST['item_comments'][$i]."',
        '".$_POST['item_code'][$i]."',
        ".$_POST['purchase_id'].",
        ".$_POST['user_id']."
      )")
      or die('Error:: ' . mysqli_error($conn));
  
    }//else ended

    
    // // UPDATE GRADE IN IMEI
    // $update_grade = mysqli_query($conn,"update tbl_imei set 
    // item_grade =".$_POST['item_grade'][$i]." 
    // where item_imei='".$_POST['item_code'][$i]."'")
    //   or die('Error:: ' . mysqli_error($conn));
  

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
    'IR-".$_POST['purchase_id']."',
    'IMEI REPAIR UPDATED',
    '".$_POST['item_comments'][$i]."',
    '".$date."',
    ".$_POST['user_id'].",
    '".$_POST['item_code'][$i]."'
    )")
    or die('Error:: ' . mysqli_error($conn));
    
  }//FOR LOOP ENDED
  
}

//Complete repair
$is_completed = $_POST['repair_completed'] === 'true' ?1:0;
$complete_query = mysqli_query($conn,"update tbl_purchases set 
repair_completed = ".$is_completed." 
where purchase_id=".$_POST['purchase_id'])
or die('Error:: ' . mysqli_error($conn));


print_r($_POST['item_code']);
// echo 'repair success';