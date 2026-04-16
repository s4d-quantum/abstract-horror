<?php include '../../../db_config.php';  ?>
<?php require_once '../../../shared/quantum_event_outbox.php'; ?>
<?php

  if (session_status() === PHP_SESSION_NONE) {
    session_start();
  }

  $itemCode = $_POST['item_code'] ;
  $pid = $_POST['purchase_id'] ;
  $trayId = $_POST['tray_id'] ;
  $user = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : (int)($_POST['user_id'] ?? 0);
  $date = date("Y-m-d");

    if( $pid && $user && $trayId && $itemCode ){

      $pid = (int)$pid;
      $trayId = mysqli_real_escape_string($conn, $trayId);
      $itemCode = mysqli_real_escape_string($conn, $itemCode);
      $oldTrayId = null;

      $existing_tray = mysqli_query(
        $conn,
        "select tray_id from tbl_purchases where purchase_id=".$pid." and item_imei='".$itemCode."' limit 1"
      );
      if ($existing_tray && mysqli_num_rows($existing_tray) === 1) {
        $existing_tray_row = mysqli_fetch_assoc($existing_tray);
        $oldTrayId = $existing_tray_row['tray_id'];
      }

      $update_tray = mysqli_query($conn,"update tbl_purchases set tray_id='".$trayId."' 
      where purchase_id=".$pid." and 
      item_imei='".$itemCode."'")
      or die('Error: '.mysqli_error($conn)); 

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
        '".$pid."',
        'TRAY UPDATED',
        '".$trayId."',
        '".$date."',
        ".$user.",
        '".$itemCode."'
        )")
        or die('Error:: ' . mysqli_error($conn));

      if ($oldTrayId !== null && $oldTrayId !== $trayId) {
        $payload = array(
          'legacy_purchase_id' => $pid,
          'legacy_imei_id' => null,
          'imei' => $itemCode,
          'old_tray_id' => $oldTrayId,
          'new_tray_id' => $trayId,
          'source' => 'quantum',
          'operation' => 'item_details_tray_update'
        );

        recordQuantumEvent(
          $conn,
          'stock.device_moved',
          'device',
          $itemCode,
          $payload,
          __FILE__,
          (string)$user,
          array($pid, $itemCode, $oldTrayId, $trayId)
        );
      }

    print json_encode("update tbl_purchases set 
      tray_id='".$trayId."' where purchase_id=".$pid." and item_imei='".$itemCode."'");
    }
    else{
    print json_encode('false');
    }
