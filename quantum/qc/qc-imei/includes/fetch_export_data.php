<?php include '../../../db_config.php';  ?>
<?php


  $order_id = $_POST['qc_id'];
  $get_products_query2 = mysqli_query($conn,"select 
  im.item_imei,
  im.item_tac,
  qc.item_comments,
  qc.item_cosmetic_passed,
  qc.item_functional_passed,
  qc.item_eu,
  qc.item_flashed

  from tbl_qc_imei_products as qc 
  inner join tbl_imei as im 
  on im.item_imei = qc.item_code

  where qc.purchase_id = ".$order_id)
  or die('error: '.mysqli_error($conn)); 

  // Store items in array
  $item_array= array();
  while($export_query = mysqli_fetch_assoc($get_products_query2)){

    $model_query = mysqli_query($conn,"select 
    tc.item_details,
    gr.title as grade,
    im.item_color,
    im.item_gb
    from 
    tbl_tac as tc left join 
    tbl_imei as im 
    on tc.item_tac = im.item_tac

    left join tbl_grades as gr 
    on gr.grade_id = im.item_grade
    
    where im.item_imei = '".$export_query['item_imei']."'")
    or die('Error:: ' . mysqli_error($conn));
    $model = mysqli_fetch_assoc($model_query);

  // if($export_query['item_flashed'] == -1){}
  $flash_desc = mysqli_query($conn,"select 
    title from tbl_flash_descriptions where desc_id = ".$export_query['item_flashed'])
    or die('error: '.mysqli_error($conn));
    $desc = mysqli_fetch_assoc($flash_desc);

    $item_array[] = array(
      'IMEI' => $export_query['item_imei'],
      'Model/Details' =>$model['item_details'],
      'Color' =>$model['item_color'],
      'GB' =>$model['item_gb'],
      'Grade' =>$model['grade'],
      'Cosmetic'=> $export_query['item_cosmetic_passed']== 1?'Passed':'Failed',
      'Functional'=> $export_query['item_functional_passed']== 1?'Passed':'Failed',
      'Fault'=> isset($desc['title']) ? $desc['title'] : '-',  //previously flashed
      'Spec'=> $export_query['item_eu'] === -1 ? '-' : $export_query['item_eu'],
      'Comments'=> $export_query['item_comments']
    );
  }

  print json_encode($item_array);