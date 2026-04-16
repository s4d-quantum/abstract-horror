<?php include '../../../db_config.php';  ?>
<?php

  $order_id = $_POST['qc_id'];
  $get_products_query2 = mysqli_query($conn,"select 
  im.item_code,
  qc.item_comments,
  qc.item_cosmetic_passed,
  qc.item_functional_passed,
  qc.item_flashed
  from tbl_qc_serial_products as qc 
  left join 
  tbl_serial_products as im on im.item_code = qc.item_code
  where qc.purchase_id = ".$order_id)
  or die('error: '.mysqli_error($conn));
  
  // Store items in array
  $item_array= array();
  while($export_query = mysqli_fetch_assoc($get_products_query2)){

    $model_query = mysqli_query($conn,"
    select 
    item_details,
    item_grade
    
    from tbl_serial_products

    where 
    item_code = '".$export_query['item_code']."'")
    or die('Error:: ' . mysqli_error($conn));
    $model = mysqli_fetch_assoc($model_query);
 
    // get item grade
    if($model['item_grade'] > 0){
      $grade_query = mysqli_query($conn,"
      select 
      title 
      from 
      tbl_grades

      where 
      grade_id = ".$model['item_grade'])
      or die('Error:: ' . mysqli_error($conn));
      $grade = mysqli_fetch_assoc($grade_query);
    }

    $flash_desc = mysqli_query($conn,"select 
    title from tbl_flash_descriptions where desc_id = ".$export_query['item_flashed'])
    or die('error: '.mysqli_error($conn));
    $desc = mysqli_fetch_assoc($flash_desc);

    $item_array[] = array(
      'Item' => $export_query['item_code'],
      'Model/Details'=>$model['item_details'],
      'Grade' => $model['item_grade'] > 0 ? $grade['title'] : '-',
      'Cosmetic'=> $export_query['item_cosmetic_passed']== 1?'Passed':'Failed',
      'Functional'=> $export_query['item_functional_passed']== 1?'Passed':'Failed',
      'Fault'=> $desc['title'], //previously flashed
      'Comments'=> $export_query['item_comments']
    );
  }

  print json_encode($item_array);