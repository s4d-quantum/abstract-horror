<?php include '../../../db_config.php';  ?>
<?php


  $customer = $_POST['customer'];
  $supplier = $_POST['supplier'];
  $po_ref = $_POST['po_ref'];
  $customer_ref = $_POST['customer_ref'];
  $user_id = $_POST['user_id'];
  $date = date('Y-m-d');

    // NEW SALES ID
    $imei_orders = mysqli_query($conn,"Select max(order_id) from tbl_imei_sales_orders")
    or die('Error:: ' . mysqli_error($conn));
    $order_id_result = mysqli_fetch_assoc($imei_orders);
    $new_ord_id = ($order_id_result['max(order_id)']+1);
  
    // Validate IMEIs for duplicates in active sales orders
    $errors = [];
    $valid_imeis = [];
    for($i = 0; $i < count($_POST['item_code']); $i++) {
      $imei = $_POST['item_code'][$i];
      $check_dup = mysqli_query($conn, "SELECT id FROM tbl_imei_sales_orders WHERE item_code = '$imei' AND is_completed = 0");
      if (mysqli_num_rows($check_dup) > 0) {
        $errors[] = "Duplicate IMEI: $imei already in active sales order.";
      } else {
        $valid_imeis[] = $i;
      }
    }

    if (!empty($errors)) {
      echo json_encode(['success' => false, 'errors' => $errors]);
      exit;
    }

    // All IMEIs unique, proceed with inserts
    // INSERT TO IMEI SALES ORDERS
    for($i = 0; $i < count($_POST['tray_id']); $i++) {
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

      // Note: We do NOT update tbl_imei.status here - items remain visible in inventory (status=1)
      // They are reserved via tbl_imei_sales_orders.is_completed = 0
      // This allows them to show as "Reserved" in inventory while preventing duplicate sales orders

      // ITEM LOG
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
        '".'SO-'.$new_ord_id."',
        'NEW SALES ORDER',
        'QTY:1',
        '".$date."',
        ".$user_id.",
        '".$_POST['item_code'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));
    }
      
    echo json_encode(['success' => true, 'order_id' => $new_ord_id]);
