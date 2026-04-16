<?php include '../../../db_config.php';  ?>
<?php require_once '../../../shared/quantum_event_outbox.php'; ?>
<?php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

  $date = str_replace("/", "-", $_POST['purchase_date']);
  $user_id = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : (int)($_POST['user_id'] ?? 0);

  if ($user_id <= 0) {
    die('Error:: Missing user session');
  }

  // NEW PURCHASE ID
  // NOTE: This route historically used MAX(purchase_id)+1 which can collide under concurrency.
  // We wrap allocation+creation in a MySQL advisory lock (no schema change). If lock cannot be acquired quickly,
  // we fall back to prior behaviour (to avoid introducing new hard failures).
  $lock_name = mysqli_real_escape_string($conn, 'idalloc:tbl_purchases:purchase_id');
  $lock_timeout = 3;
  $got_lock = false;
  $lock_rs = mysqli_query($conn, "SELECT GET_LOCK('".$lock_name."', ".$lock_timeout.") AS got_lock");
  if ($lock_rs) {
    $lock_row = mysqli_fetch_assoc($lock_rs);
    $got_lock = isset($lock_row['got_lock']) && (string)$lock_row['got_lock'] === '1';
  }

  try {
    $new_pur_id_query = mysqli_query($conn,"Select max(purchase_id) from tbl_purchases")
    or die('Error:: ' . mysqli_error($conn));
    $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
    $new_pur_id = ($order_id_result['max(purchase_id)']+1);

    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0;$i<count($_POST['imei_field']);$i++){
      $itemColor = trim($_POST['color_field'][$i]);

      $new_purchase = mysqli_query($conn,"insert into tbl_purchases (
        purchase_id,
        date,
        supplier_id,
        tray_id,
        qc_required,
        qc_completed, 
        repair_required,
        repair_completed,
        user_id,
        item_imei,
        purchase_return,
        po_ref,
        unit_confirmed,
        has_return_tag)
        values(
        '".$new_pur_id."',
        '".$date."',
        '".$_POST['purchase_supplier']."',
        '".$_POST['tray_id'][$i]."',
        ".$_POST['qc_required'].",
        0,
        ".$_POST['repair_required'].",
        0,
        ".$user_id.",
        '".$_POST['imei_field'][$i]."',
        0,
        '".$_POST['po_ref']."',
        0,
        0
        )")
        or die('Error:: ' . mysqli_error($conn));

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
        $purchase_details = mysqli_query($conn,"insert into tbl_tac (item_tac,
        item_details,item_brand) 
        values('".$tac."',
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
          purchase_id = '".$new_pur_id."',
          item_color = '".$itemColor."',
          goodsin_color = '".$itemColor."',
          item_grade = '".$_POST['grade_field'][$i]."',
          item_gb = '".$_POST['gb_field'][$i]."', 
          status = 1
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
          goodsin_color,
          item_grade,
          item_gb)
          values(
            1,
            '".$new_pur_id."',
            '".$_POST['imei_field'][$i]."',
            '".$tac."',
            '".$itemColor."',
            '".$itemColor."',
            '".$_POST['grade_field'][$i]."',
            '".$_POST['gb_field'][$i]."')")
          or die('Error:: ' . mysqli_error($conn));
      }//else ended

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
      '".'IP-'.$new_pur_id."',
      'NEW IMEI PURCHASE',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$_POST['imei_field'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));

      $payload = array(
        'purchase_id' => (int)$new_pur_id,
        'legacy_imei_id' => null,
        'imei' => $_POST['imei_field'][$i],
        'item_tac' => $tac,
        'tray_id' => $_POST['tray_id'][$i],
        'supplier_id' => $_POST['purchase_supplier'],
        'purchase_date' => $date,
        'po_ref' => $_POST['po_ref'],
        'qc_required' => (int)$_POST['qc_required'],
        'repair_required' => (int)$_POST['repair_required'],
        'item_color' => $itemColor,
        'item_grade' => $_POST['grade_field'][$i],
        'item_gb' => $_POST['gb_field'][$i],
        'source' => 'quantum',
        'operation' => 'goods_in_submit'
      );

      recordQuantumEvent(
        $conn,
        'goods_in.device_booked',
        'device',
        $_POST['imei_field'][$i],
        $payload,
        __FILE__,
        (string)$user_id,
        array((int)$new_pur_id, $_POST['imei_field'][$i])
      );

    }//for loop ended

    echo $new_pur_id;
  } finally {
    if ($got_lock) {
      mysqli_query($conn, "SELECT RELEASE_LOCK('".$lock_name."')");
    }
  }
