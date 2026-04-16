<?php include '../../../db_config.php';  ?>
<?php require_once '../../../shared/quantum_event_outbox.php'; ?>
<?php

    $oid = $_POST['order_id'];
    $is_delivered = $_POST['is_delivered'];
    $date = date("Y-m-d");
    $previous_value = null;
    $sales_order_id = null;

    $existing_query = mysqli_query($conn,"
      select is_delivered
      from tbl_orders
      where order_id=".$oid."
      limit 1
    ");
    if ($existing_query && mysqli_num_rows($existing_query) > 0) {
      $existing_row = mysqli_fetch_assoc($existing_query);
      $previous_value = isset($existing_row['is_delivered']) ? (int)$existing_row['is_delivered'] : null;
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
    set is_delivered = ".$is_delivered." where order_id=".$oid);

    if ($update_unit_query) {
      $payload = array(
        'legacy_goodsout_order_id' => (int)$oid,
        'legacy_sales_order_id' => $sales_order_id,
        'is_delivered' => (int)$is_delivered,
        'previous_is_delivered' => $previous_value,
        'changed_at' => $date,
        'source' => 'quantum',
        'operation' => 'update_delivery_status'
      );

      recordQuantumEvent(
        $conn,
        'sales_order.delivery_status_updated',
        'goodsout_order',
        (string)$oid,
        $payload,
        __FILE__,
        isset($_SESSION['user_id']) ? (string)$_SESSION['user_id'] : null,
        array((int)$oid, 'is_delivered', (int)$is_delivered)
      );
    }
        
    print json_encode($update_unit_query);
