<?php include '../../../db_config.php';  ?>
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

    print json_encode("update tbl_purchases set 
      tray_id='".$trayId."' where purchase_id=".$pid." and item_imei='".$itemCode."'");
    }
    else{
    print json_encode('false');
    }
