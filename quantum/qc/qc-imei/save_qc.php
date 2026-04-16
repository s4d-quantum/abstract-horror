<?php include '../../db_config.php';  ?>
<?php require_once '../../shared/quantum_event_outbox.php'; ?>
<?php

$date = date('Y-m-d');

// echo $date;
// die();

if(isset($_POST['item_code'])){

  for($i=0; $i<count($_POST['item_code']); $i++){

    $check_query = mysqli_query($conn,"select count(distinct id) as id from 
    tbl_qc_imei_products where item_code='".$_POST['item_code'][$i]."' 
    AND purchase_id=".$_POST['purchase_id'])
    or die('Error:: ' . mysqli_error($conn));
    $check = mysqli_fetch_assoc($check_query);
  
    // if items already in QC
    if($check['id'] > 0){
  
      // update qc products details
      $update_query = mysqli_query($conn,"update tbl_qc_imei_products 
      set 
      item_comments ='".$_POST['item_comments'][$i]."',
      item_eu ='".$_POST['item_eu'][$i]."',
      item_flashed =".$_POST['item_flashed'][$i].",
      item_cosmetic_passed =".$_POST['item_cosmetic_passed'][$i].",
      item_functional_passed =".$_POST['item_functional_passed'][$i]."
      where item_code ='".$_POST['item_code'][$i]."' AND 
      purchase_id=".$_POST['purchase_id'])
      or die('Error:: ' . mysqli_error($conn));
  
  
    }
    // items newly already in DB
    else{
      // update qc products details
      $insert_query = mysqli_query($conn,"insert into tbl_qc_imei_products 
      (
      item_comments, 
      item_eu, 
      item_flashed, 
      item_cosmetic_passed, 
      item_functional_passed, 
      item_code, 
      purchase_id,
      user_id) values 
      (
        '".$_POST['item_comments'][$i]."',
        '".$_POST['item_eu'][$i]."',
        ".$_POST['item_flashed'][$i].",
        ".$_POST['item_cosmetic_passed'][$i].",
        ".$_POST['item_functional_passed'][$i].",
        '".$_POST['item_code'][$i]."',
        ".$_POST['purchase_id'].",
        ".$_POST['user_id']."
      )")
      or die('Error:: ' . mysqli_error($conn));
  
    }//else ended

    
    // UPDATE GRADE / COLOR IN IMEI
    $gradeValue = intval($_POST['item_grade'][$i]);
    $colorClause = "";
    if(isset($_POST['item_color'][$i])){
      $colorValue = trim($_POST['item_color'][$i]);
      $escapedColor = mysqli_real_escape_string($conn, $colorValue);
      $colorClause = ", item_color ='".$escapedColor."'";
    }
    $update_grade = mysqli_query($conn,"update tbl_imei set 
    item_grade =".$gradeValue.$colorClause." 
    where item_imei='".$_POST['item_code'][$i]."'")
      or die('Error:: ' . mysqli_error($conn));
  

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
    'IP-".$_POST['purchase_id']."',
    'IMEI QC UPDATED',
    '".$_POST['item_comments'][$i]."',
    '".$date."',
    ".$_POST['user_id'].",
    '".$_POST['item_code'][$i]."'
    )")
    or die('Error:: ' . mysqli_error($conn));

    $qcUpdatedPayload = array(
      'legacy_purchase_id' => (int)$_POST['purchase_id'],
      'legacy_imei_id' => null,
      'imei' => $_POST['item_code'][$i],
      'item_grade' => $gradeValue,
      'item_color' => isset($_POST['item_color'][$i]) ? trim($_POST['item_color'][$i]) : null,
      'item_comments' => $_POST['item_comments'][$i],
      'item_eu' => $_POST['item_eu'][$i],
      'item_flashed' => (int)$_POST['item_flashed'][$i],
      'item_cosmetic_passed' => (int)$_POST['item_cosmetic_passed'][$i],
      'item_functional_passed' => (int)$_POST['item_functional_passed'][$i],
      'qc_completed' => $_POST['qc_completed'] === 'true' ? 1 : 0,
      'source' => 'quantum',
      'operation' => 'qc_save'
    );

    recordQuantumEvent(
      $conn,
      'qc.updated',
      'device',
      $_POST['item_code'][$i],
      $qcUpdatedPayload,
      __FILE__,
      (string)$_POST['user_id'],
      array((int)$_POST['purchase_id'], $_POST['item_code'][$i], 'qc.updated')
    );
    
  }//FOR LOOP ENDED
  
}

//Complete qc
$is_completed = $_POST['qc_completed'] === 'true' ?1:0;
$complete_query = mysqli_query($conn,"update tbl_purchases set 
qc_completed = ".$is_completed." 
where purchase_id=".$_POST['purchase_id'])
or die('Error:: ' . mysqli_error($conn));

if ($is_completed === 1) {
  $qc_event_rows = mysqli_query($conn,"
    select
    pr.purchase_id,
    pr.item_imei,
    pr.tray_id,
    pr.qc_required,
    pr.qc_completed,
    qc.item_comments,
    qc.item_eu,
    qc.item_flashed,
    qc.item_cosmetic_passed,
    qc.item_functional_passed,
    im.item_grade,
    im.item_color,
    im.item_gb
    from tbl_purchases as pr
    left join tbl_qc_imei_products as qc
      on qc.item_code = pr.item_imei and qc.purchase_id = pr.purchase_id
    left join tbl_imei as im
      on im.item_imei = pr.item_imei
    where pr.purchase_id=".$_POST['purchase_id']."
    order by pr.id
  ")
  or die('Error:: ' . mysqli_error($conn));

  while ($qc_event_row = mysqli_fetch_assoc($qc_event_rows)) {
    $cosmeticPassed = isset($qc_event_row['item_cosmetic_passed']) ? (int)$qc_event_row['item_cosmetic_passed'] : -1;
    $functionalPassed = isset($qc_event_row['item_functional_passed']) ? (int)$qc_event_row['item_functional_passed'] : -1;
    $eventType = null;

    if ($cosmeticPassed === 1 && $functionalPassed === 1) {
      $eventType = 'qc.device_passed';
    } elseif ($cosmeticPassed === 0 || $functionalPassed === 0) {
      $eventType = 'qc.device_failed';
    }

    if ($eventType === null) {
      continue;
    }

    $payload = array(
      'legacy_purchase_id' => (int)$qc_event_row['purchase_id'],
      'legacy_imei_id' => null,
      'imei' => $qc_event_row['item_imei'],
      'tray_id' => $qc_event_row['tray_id'],
      'item_grade' => $qc_event_row['item_grade'],
      'item_color' => $qc_event_row['item_color'],
      'item_gb' => $qc_event_row['item_gb'],
      'item_comments' => $qc_event_row['item_comments'],
      'item_eu' => $qc_event_row['item_eu'],
      'item_flashed' => $qc_event_row['item_flashed'],
      'item_cosmetic_passed' => $cosmeticPassed,
      'item_functional_passed' => $functionalPassed,
      'qc_required' => isset($qc_event_row['qc_required']) ? (int)$qc_event_row['qc_required'] : null,
      'qc_completed' => isset($qc_event_row['qc_completed']) ? (int)$qc_event_row['qc_completed'] : 0,
      'source' => 'quantum',
      'operation' => 'qc_save'
    );

    recordQuantumEvent(
      $conn,
      $eventType,
      'device',
      $qc_event_row['item_imei'],
      $payload,
      __FILE__,
      (string)$_POST['user_id'],
      array((int)$qc_event_row['purchase_id'], $qc_event_row['item_imei'], $eventType)
    );
  }
}

print_r($_POST['item_code']);
// echo 'QC success';
