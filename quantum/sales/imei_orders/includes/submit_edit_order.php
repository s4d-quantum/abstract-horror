<?php include '../../../db_config.php';  ?>
<?php require_once '../../../shared/quantum_event_outbox.php'; ?>
<?php


  $customer = $_POST['customer'];
  $supplier = $_POST['supplier'];
  $po_ref = $_POST['po_ref'];
  $customer_ref = $_POST['customer_ref'];
  $user_id = $_POST['user_id'];
  $new_ord_id = $_POST['order_id'];
  $date = date('Y-m-d');
  $existing_order_items = array();
  $existing_items_by_imei = array();
  $last_log_id = 0;

    $fetch_existing_order_items = mysqli_query($conn,"
      select
      customer_id,
      supplier_id,
      po_ref,
      customer_ref,
      item_color,
      item_brand,
      item_details,
      item_gb,
      item_grade,
      tray_id,
      item_code
      from tbl_imei_sales_orders
      where order_id=".$new_ord_id."
      order by id
    ")
    or die('Error:: ' . mysqli_error($conn));

    while ($existing_row = mysqli_fetch_assoc($fetch_existing_order_items)) {
      $existing_order_items[] = $existing_row;
      $existing_items_by_imei[$existing_row['item_code']] = $existing_row;
    }

    // DELETE PREV ADDED ITEMS 
    $delete_prev_order_items = mysqli_query($conn,"delete from tbl_imei_sales_orders where 
    order_id=".$new_ord_id)
    or die('Error:: ' . mysqli_error($conn));
  
    // ============= 
    // ADD NEW DATA
    // ============= 

    // INSERT TO IMEI SALES ORDERS
    $new_order_items = array();
    $new_items_by_imei = array();
    for($i = 0;$i<count($_POST['tray_id']);$i++){
  
      $new_purchase = mysqli_query($conn,"insert into tbl_imei_sales_orders (
        order_id,
        date,
        po_ref,
        customer_ref,
        customer_id,
        supplier_id,
        user_id,
        item_color,
        item_brand,
        item_details,
        item_gb,
        item_grade,
        tray_id,
        item_code,
        is_completed
        )
        values(
        $new_ord_id,
        '".$date."',
        '".$po_ref."',
        '".$customer_ref."',
        '".$customer."',
        '".$supplier[$i]."',
        '".$user_id."',
        '".$_POST['item_color'][$i]."',
        '".$_POST['item_brand'][$i]."',
        '".$_POST['item_details'][$i]."',
        '".$_POST['item_gb'][$i]."',
        '".$_POST['item_grade'][$i]."',
        '".$_POST['tray_id'][$i]."',
        '".$_POST['item_code'][$i]."',
        0)")
        or die('Error:: ' . mysqli_error($conn));

        // ITEM LOG
        $new_log = mysqli_query($conn,"insert into tbl_log (
          ref,
          subject,
          date, 
          user_id
          )
          values
          (
          '".'SO-'.$new_ord_id."',
          'UPDATED SALES ORDER',
          '".$date."',
          ".$user_id."
          )")
          or die('Error:: ' . mysqli_error($conn));

        $last_log_id = (int)mysqli_insert_id($conn);
        $new_item = array(
          'customer_id' => $customer,
          'supplier_id' => $supplier[$i],
          'po_ref' => $po_ref,
          'customer_ref' => $customer_ref,
          'item_color' => $_POST['item_color'][$i],
          'item_brand' => $_POST['item_brand'][$i],
          'item_details' => $_POST['item_details'][$i],
          'item_gb' => $_POST['item_gb'][$i],
          'item_grade' => $_POST['item_grade'][$i],
          'tray_id' => $_POST['tray_id'][$i],
          'item_code' => $_POST['item_code'][$i]
        );

        $new_order_items[] = $new_item;
        $new_items_by_imei[$_POST['item_code'][$i]] = $new_item;
  
    }

    $existing_item_codes = array_keys($existing_items_by_imei);
    $new_item_codes = array_keys($new_items_by_imei);
    $added_item_codes = array_values(array_diff($new_item_codes, $existing_item_codes));
    $removed_item_codes = array_values(array_diff($existing_item_codes, $new_item_codes));
    sort($added_item_codes);
    sort($removed_item_codes);

    $changed_items = array();
    foreach ($new_items_by_imei as $imei => $new_item) {
      if (!isset($existing_items_by_imei[$imei])) {
        continue;
      }

      $existing_item = $existing_items_by_imei[$imei];
      if (
        $existing_item['customer_id'] !== $new_item['customer_id'] ||
        $existing_item['supplier_id'] !== $new_item['supplier_id'] ||
        $existing_item['po_ref'] !== $new_item['po_ref'] ||
        $existing_item['customer_ref'] !== $new_item['customer_ref'] ||
        $existing_item['item_color'] !== $new_item['item_color'] ||
        $existing_item['item_brand'] !== $new_item['item_brand'] ||
        $existing_item['item_details'] !== $new_item['item_details'] ||
        $existing_item['item_gb'] !== $new_item['item_gb'] ||
        $existing_item['item_grade'] !== $new_item['item_grade'] ||
        $existing_item['tray_id'] !== $new_item['tray_id']
      ) {
        $changed_items[$imei] = array(
          'old' => $existing_item,
          'new' => $new_item
        );
      }
    }

    $existing_order_header = !empty($existing_order_items) ? $existing_order_items[0] : null;
    $header_changed =
      !$existing_order_header ||
      $existing_order_header['customer_id'] !== $customer ||
      $existing_order_header['po_ref'] !== $po_ref ||
      $existing_order_header['customer_ref'] !== $customer_ref;

    if ($header_changed || !empty($added_item_codes) || !empty($removed_item_codes) || !empty($changed_items)) {
      $payload = array(
        'legacy_order_id' => (int)$new_ord_id,
        'customer_id' => $customer,
        'po_ref' => $po_ref,
        'customer_ref' => $customer_ref,
        'previous_customer_id' => $existing_order_header ? $existing_order_header['customer_id'] : null,
        'previous_po_ref' => $existing_order_header ? $existing_order_header['po_ref'] : null,
        'previous_customer_ref' => $existing_order_header ? $existing_order_header['customer_ref'] : null,
        'item_codes' => array_values($new_item_codes),
        'added_item_codes' => $added_item_codes,
        'removed_item_codes' => $removed_item_codes,
        'changed_items' => $changed_items,
        'items' => $new_order_items,
        'source' => 'quantum',
        'operation' => 'sales_order_edit_submit'
      );

      recordQuantumEvent(
        $conn,
        'sales_order.updated',
        'sales_order',
        (string)$new_ord_id,
        $payload,
        __FILE__,
        (string)$user_id,
        array((int)$new_ord_id, $last_log_id)
      );
    }
      
    print json_encode($_POST);
