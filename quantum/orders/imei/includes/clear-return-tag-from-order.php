<?php include '../../../db_config.php';  ?>
<?php require_once '../../../shared/quantum_event_outbox.php'; ?>
<?php

    $oid = $_POST['order_id'];
    $uid = $_POST['user_id'];
    $date = date("Y-m-d");
    $previous_has_return_tag = null;
    $order_return = null;
    $customer_id = null;
    $sales_order_id = null;

    $existing_query = mysqli_query($conn,"
      select has_return_tag, order_return, customer_id
      from tbl_orders
      where order_id=".$oid."
      limit 1
    ");
    if ($existing_query && mysqli_num_rows($existing_query) > 0) {
      $existing_row = mysqli_fetch_assoc($existing_query);
      $previous_has_return_tag = isset($existing_row['has_return_tag']) ? (int)$existing_row['has_return_tag'] : null;
      $order_return = isset($existing_row['order_return']) ? (int)$existing_row['order_return'] : null;
      $customer_id = $existing_row['customer_id'];
    }

    $sales_query = mysqli_query($conn,"
      select order_id as sales_order_id
      from tbl_imei_sales_orders
      where goodsout_order_id=".$oid."
      limit 1
    ");
    if ($sales_query && mysqli_num_rows($sales_query) > 0) {
      $sales_row = mysqli_fetch_assoc($sales_query);
      $sales_order_id = isset($sales_row['sales_order_id']) ? (int)$sales_row['sales_order_id'] : null;
    }
 
    $update_unit_query = mysqli_query($conn,"update tbl_orders 
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
      'IO-".$oid."',
      'RETURN TAG REMOVED',
      '',
      '".$date."',
      '".$uid."',
      ''
      )")
      or die('Error:: ' . mysqli_error($conn));

    if ($update_unit_query && $new_log) {
      $payload = array(
        'legacy_goodsout_order_id' => (int)$oid,
        'legacy_sales_order_id' => $sales_order_id,
        'customer_id' => $customer_id,
        'order_return' => $order_return,
        'has_return_tag' => 1,
        'previous_has_return_tag' => $previous_has_return_tag,
        'changed_at' => $date,
        'source' => 'quantum',
        'operation' => 'clear_return_tag_from_order'
      );

      recordQuantumEvent(
        $conn,
        'sales_order.return_tag_cleared',
        'goodsout_order',
        (string)$oid,
        $payload,
        __FILE__,
        (string)$uid,
        array((int)$oid, 'has_return_tag', 1)
      );
    }


      print json_encode($update_unit_query);
