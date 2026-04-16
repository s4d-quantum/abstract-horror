<?php include '../../../db_config.php';  ?>
<?php require_once '../../../shared/quantum_event_outbox.php'; ?>
<?php

  $new_pur_id = $_POST['purchase_id'];
  $curr_date = date("Y-m-d");
  $existing_purchase_items = array();
  $existing_items_by_imei = array();
  $last_log_id = 0;

  // fetch purchase details
  $fetch_purchase_query = mysqli_query($conn,"select * from tbl_purchases where 
  purchase_id='".$new_pur_id."'")
    or die('Error:: ' . mysqli_error($conn));
  $fetch_purchase = mysqli_fetch_assoc($fetch_purchase_query);

  $date = $fetch_purchase['date'];
  $supplier_id = $_POST['purchase_supplier'];
  $user_id = $_POST['user_id'];
  $priority = is_null($fetch_purchase['priority']) ? 0 : $fetch_purchase['priority'];
  $has_return_tag = $fetch_purchase['has_return_tag'];
  $unit_confirmed = $fetch_purchase['unit_confirmed'];

  $fetch_existing_purchase_items = mysqli_query($conn,"
    select
    pr.supplier_id,
    pr.date,
    pr.qc_required,
    pr.repair_required,
    pr.tray_id,
    pr.purchase_return,
    pr.po_ref,
    im.item_imei,
    im.item_tac,
    im.item_color,
    im.item_grade,
    im.item_gb,
    im.status,
    tc.item_details,
    tc.item_brand
    from tbl_purchases as pr
    left join tbl_imei as im on im.item_imei = pr.item_imei
    left join tbl_tac as tc on tc.item_tac = im.item_tac
    where pr.purchase_id='".$new_pur_id."'
    order by pr.id
  ")
  or die('Error:: ' . mysqli_error($conn));

  while($existing_row = mysqli_fetch_assoc($fetch_existing_purchase_items)){
    $existing_purchase_items[] = $existing_row;
    $existing_items_by_imei[$existing_row['item_imei']] = $existing_row;
  }

  /* 
    1 - Fetch all previous items and match with each new items, 
    2 - if any previous item does not match, remove it, and those which 
        match, update all those 
    3 - if any item from new items does not match, Add it, 
  */

  /* 1 - fetch prev items */
  $fetch_prev_items = mysqli_query($conn,"select item_imei from tbl_purchases 
    where purchase_id =".$new_pur_id)
    or die('Error:: ' . mysqli_error($conn));

  $prev_items = array();
  while($t = mysqli_fetch_assoc($fetch_prev_items)){
    $prev_items[] = array(
      'item_imei'=> $t['item_imei']
    );
  }


  /* 2 - if any previous item does not match, remove it */
  $isMatched = 0;
  // echo json_encode($prev_items[$i]['item_imei']);
  for($i = 0;$i<count($prev_items);$i++){
    for($j = 0;$j<count($_POST['imei_field']);$j++){

      if($prev_items[$i]['item_imei'] === $_POST['imei_field'][$j]){
        $isMatched = 1;
        
        // update item details with new details
        $update_item = mysqli_query($conn,"update tbl_purchases 
        set 
        supplier_id = '".$_POST['purchase_supplier']."',
        date = '".$date."',

        qc_required = ".$_POST['qc_required'].",
        qc_completed = 0,

        repair_required = ".$_POST['repair_required'].",
        repair_completed=0,

        user_id = '".$user_id."',
        tray_id = '".$_POST['tray_id'][$j]."',
        purchase_return = ".$_POST['purchase_return'][$j]." ,
        priority=".$priority.",
        po_ref='".$_POST['po_ref']."',
        unit_confirmed=".$unit_confirmed.",
        has_return_tag=".$has_return_tag."

        where item_imei='".$_POST['imei_field'][$j]."' and purchase_id=".$new_pur_id)
        or die('Error:: ' . mysqli_error($conn));

        break;
        // echo 'matched!!';
      }
    }
    // if this prev item does not matched with new items, delete it
    if($isMatched === 0){
      // del from tbl_purchases 
      $del_prev_item= mysqli_query($conn,"delete from tbl_purchases where 
      item_imei = '".$prev_items[$i]['item_imei']."' and purchase_id='".$new_pur_id."'")
      or die('Error:: ' . mysqli_error($conn));
      echo 'not matched!!';

      // chnage item status to 0
      $imei_status= mysqli_query($conn,"update tbl_imei set status = 0 where 
      item_imei = '".$prev_items[$i]['item_imei']."' and purchase_id='".$new_pur_id."'")
      or die('Error:: ' . mysqli_error($conn));
      echo 'not matched!!';

      // remove from tbl_qc_imei_products (even if item does not exist it wont give error)
      $qc_update= mysqli_query($conn,"delete from tbl_qc_imei_products where 
      item_code = '".$prev_items[$i]['item_imei']."' and purchase_id='".$new_pur_id."'")
      or die('Error:: ' . mysqli_error($conn));
      echo 'not matched!!';

      // deleted item log
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
        'IP-".$new_pur_id."',
        'DELETED FROM EDIT IMEI PURCHASE',
        'QTY:1',
        '".$curr_date."',
        ".$user_id.",
        '".$prev_items[$i]['item_imei']."')")
        or die('Error:: ' . mysqli_error($conn));

    }
    $isMatched = 0; //set ismatched back to 0 for next iteration        
  }
  

  /* 3 - if any item from new items does not match, Add it, */
  $isMatched = 0;
  for($i = 0;$i<count($_POST['imei_field']);$i++){
    for($j = 0;$j<count($prev_items);$j++){
      if($prev_items[$j]['item_imei'] === $_POST['imei_field'][$i]){
        $isMatched = 1;
      }
    }
    // if no new item matched, means its newly added, add it
    if($isMatched === 0){
      $add_new_item = mysqli_query($conn,"insert into tbl_purchases (
        purchase_id,
        supplier_id,
        date,
        qc_required,
        qc_completed,
        user_id,
        tray_id,
        purchase_return,
        item_imei,
        priority,
        po_ref,
        unit_confirmed,
        has_return_tag
        ) values(
          '".$new_pur_id."',
          '".$_POST['purchase_supplier']."',
          '".$date."',".
          $_POST['qc_required'].",
          0,
          ".$user_id.",
          '".$_POST['tray_id'][$i]."',".
          $_POST['purchase_return'][$i].",
          '".$_POST['imei_field'][$i]."',
          ".$priority.",
          '".$_POST['po_ref']."',
          0,
          0
          )")
        or die('Error:: ' . mysqli_error($conn));
      }
    $isMatched = 0; //set ismatched back to 0 for next iteration        
  }


  // INSERT TO PURCHASE INVENTORY TBL
  $new_purchase_items = array();
  $new_items_by_imei = array();
  for($i = 0;$i<count($_POST['imei_field']);$i++){


    // Break imei into tac
    $tac = substr($_POST['imei_field'][$i],0,8);

    // =============
    // Add into TAC table
    // =============
    $existing_tac = mysqli_query($conn,"select count(*) as count from tbl_tac where 
    item_tac='".$tac."'")
    or die('Error:: ' . mysqli_error($conn));
    $is_existing_tac = mysqli_fetch_assoc($existing_tac)['count'];

    if($is_existing_tac > 0){
      $purchase_details = mysqli_query($conn,"update tbl_tac 
      set 
      item_details = '".trim($_POST['details_field'][$i])."',
      item_brand = '".$_POST['brand_field'][$i]."' 
      where item_tac ='".$tac."'")
      or die('Error:: ' . mysqli_error($conn)); 
    }
    else{
      $purchase_details = mysqli_query($conn,"insert into tbl_tac (
      item_tac,
      item_details,
      item_brand) 
      values(
      '".$tac."',
      '".trim($_POST['details_field'][$i])."',
      '".$_POST['brand_field'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));
    }

    // =============
    // Search if IMEI is new or already existed before and returned?
    // =============
    $existing_imei = mysqli_query($conn,"select count(*) as count from tbl_imei where 
    item_imei='".$_POST['imei_field'][$i]."'")
    or die('Error:: ' . mysqli_error($conn));
    $is_existing_imei = mysqli_fetch_assoc($existing_imei)['count'];

    if($is_existing_imei > 0){
      // NEW imei entry
      $purchase_imei = mysqli_query($conn,"update tbl_imei 
        set 
        item_color = '".trim($_POST['color_field'][$i])."',
        item_grade = '".$_POST['grade_field'][$i]."',
        item_gb = '".$_POST['gb_field'][$i]."', 
        purchase_id = '".$new_pur_id."',
        status = ".$_POST['status'][$i]."
        where item_imei = '".$_POST['imei_field'][$i]."'")
        or die('Error:: ' . mysqli_error($conn));

      }//if ended
    else{
      // NEW imei entry
      $purchase_imei = mysqli_query($conn,"insert into tbl_imei (
        status,
        purchase_id,
        item_imei,
        item_tac,
        item_color,
        item_grade,
        item_gb)
        values(
          ".$_POST['status'][$i].",
          '".$new_pur_id."',
          '".$_POST['imei_field'][$i]."',
          '".$tac."',
          '".trim($_POST['color_field'][$i])."',
          '".$_POST['grade_field'][$i]."',
          '".$_POST['gb_field'][$i]."')")
        or die('Error:: ' . mysqli_error($conn));

    }//else ended

    // INPUT LOG
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
    'IP-".$new_pur_id."',
    'EDIT IMEI PURCHASE',
    'QTY:1',
    '".$curr_date."',
    ".$user_id.",
    '".$_POST['imei_field'][$i]."')")
    or die('Error:: ' . mysqli_error($conn));

    $last_log_id = (int)mysqli_insert_id($conn);
    $new_item = array(
      'supplier_id' => $_POST['purchase_supplier'],
      'date' => $date,
      'qc_required' => (int)$_POST['qc_required'],
      'repair_required' => (int)$_POST['repair_required'],
      'tray_id' => $_POST['tray_id'][$i],
      'purchase_return' => (int)$_POST['purchase_return'][$i],
      'po_ref' => $_POST['po_ref'],
      'item_imei' => $_POST['imei_field'][$i],
      'item_tac' => $tac,
      'item_color' => trim($_POST['color_field'][$i]),
      'item_grade' => $_POST['grade_field'][$i],
      'item_gb' => $_POST['gb_field'][$i],
      'status' => (int)$_POST['status'][$i],
      'item_details' => trim($_POST['details_field'][$i]),
      'item_brand' => $_POST['brand_field'][$i]
    );

    $new_purchase_items[] = $new_item;
    $new_items_by_imei[$_POST['imei_field'][$i]] = $new_item;
  }//for loop ended

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
      $existing_item['supplier_id'] !== $new_item['supplier_id'] ||
      $existing_item['date'] !== $new_item['date'] ||
      $existing_item['qc_required'] != $new_item['qc_required'] ||
      $existing_item['repair_required'] != $new_item['repair_required'] ||
      $existing_item['tray_id'] !== $new_item['tray_id'] ||
      $existing_item['purchase_return'] != $new_item['purchase_return'] ||
      $existing_item['po_ref'] !== $new_item['po_ref'] ||
      $existing_item['item_tac'] !== $new_item['item_tac'] ||
      $existing_item['item_color'] !== $new_item['item_color'] ||
      $existing_item['item_grade'] !== $new_item['item_grade'] ||
      $existing_item['item_gb'] !== $new_item['item_gb'] ||
      $existing_item['status'] != $new_item['status'] ||
      $existing_item['item_details'] !== $new_item['item_details'] ||
      $existing_item['item_brand'] !== $new_item['item_brand']
    ) {
      $changed_items[$imei] = array(
        'old' => $existing_item,
        'new' => $new_item
      );
    }
  }

  $existing_purchase_header = !empty($existing_purchase_items) ? $existing_purchase_items[0] : null;
  $header_changed =
    !$existing_purchase_header ||
    $existing_purchase_header['supplier_id'] !== $_POST['purchase_supplier'] ||
    $existing_purchase_header['date'] !== $date ||
    $existing_purchase_header['qc_required'] != $_POST['qc_required'] ||
    $existing_purchase_header['repair_required'] != $_POST['repair_required'] ||
    $existing_purchase_header['po_ref'] !== $_POST['po_ref'];

  if ($header_changed || !empty($added_item_codes) || !empty($removed_item_codes) || !empty($changed_items)) {
    $payload = array(
      'legacy_purchase_id' => (int)$new_pur_id,
      'supplier_id' => $_POST['purchase_supplier'],
      'purchase_date' => $date,
      'po_ref' => $_POST['po_ref'],
      'qc_required' => (int)$_POST['qc_required'],
      'repair_required' => (int)$_POST['repair_required'],
      'previous_supplier_id' => $existing_purchase_header ? $existing_purchase_header['supplier_id'] : null,
      'previous_purchase_date' => $existing_purchase_header ? $existing_purchase_header['date'] : null,
      'previous_po_ref' => $existing_purchase_header ? $existing_purchase_header['po_ref'] : null,
      'item_codes' => array_values($new_item_codes),
      'added_item_codes' => $added_item_codes,
      'removed_item_codes' => $removed_item_codes,
      'changed_items' => $changed_items,
      'items' => $new_purchase_items,
      'source' => 'quantum',
      'operation' => 'goods_in_edit_submit'
    );

    recordQuantumEvent(
      $conn,
      'purchase.updated',
      'purchase',
      (string)$new_pur_id,
      $payload,
      __FILE__,
      (string)$user_id,
      array((int)$new_pur_id, $last_log_id)
    );
  }
