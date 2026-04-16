<?php include '../../../db_config.php';  ?>
<?php

    $oid = $_POST['order_id'];
    $uid = $_POST['user_id'];
    $date = date("Y-m-d");
 
    $update_unit_query = mysqli_query($conn,"update tbl_serial_orders 
    set has_return_tag = 1 where order_id=".$oid);
        
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
      'SO-".$oid."',
      'SERIAL GOODSOUT RETURN TAG REMOVED',
      '',
      '".$date."',
      '".$uid."',
      ''
      )")
      or die('Error:: ' . mysqli_error($conn));


      print json_encode($update_unit_query);
