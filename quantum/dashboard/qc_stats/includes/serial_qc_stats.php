<?php include '../../../db_config.php';  ?>
  <?php 
  // fetch all incomplete PIDs
  $fetch_incomplete = mysqli_query($conn, "select distinct purchase_id from tbl_serial_purchases where 
  qc_required = 1 AND qc_completed = 0")
  or die('Error: '.mysqli_error($conn)); 


  // Total pending items sum 
  $total_sum = 0;
  
  // find items which are pending qc 
  $item_array= array();
  while($pid = mysqli_fetch_assoc($fetch_incomplete)){

  // first find if any the pid is available in tbl_qc_serial_products, 
  $pid_in_qc = mysqli_query($conn, "select count(purchase_id) as total from tbl_qc_serial_products 
  where purchase_id=".$pid['purchase_id'])
  or die('Error: '.mysqli_error($conn)); 
  $is_pid_in_qc = mysqli_fetch_assoc($pid_in_qc);

  
  // 1 - if no it means qc not yet start, 
  if($is_pid_in_qc['total'] == 0){
    $fetch_all_items = mysqli_query($conn, "select count(item_code) as total from tbl_serial_purchases  
    where purchase_id=".$pid['purchase_id'])
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_all_items)['total'];
  }
  // 2 - if yes then find how many are pending 
  else{
    $fetch_pending_rows = mysqli_query($conn, "select count(item_code) as total from tbl_qc_serial_products 
    where  
    item_cosmetic_passed = -1 AND 
    item_functional_passed = -1 AND 
    purchase_id=".$pid['purchase_id'])
    
    or die('Error: '.mysqli_error($conn)); 
    $total_rows_count = mysqli_fetch_assoc($fetch_pending_rows)['total'];
  }

  $total_sum += $total_rows_count;

}    

// output
print json_encode($total_sum);
