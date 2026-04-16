<?php include '../../db_config.php';  ?>
<?php require_once '../../shared/quantum_event_outbox.php'; ?>
<?php

function quantumRepairFetchPartsSnapshot($db, $purchaseId, $itemCode) {
  $parts = array();
  $purchaseId = (int)$purchaseId;
  $escapedItemCode = mysqli_real_escape_string($db, $itemCode);

  $partsQuery = mysqli_query($db, "
    select
    r.part_id,
    r.part_qty,
    p.title,
    p.item_brand,
    p.item_model,
    p.item_color,
    p.item_tac
    from tbl_repair_imei_parts as r
    left join tbl_parts_products as p
      on p.id = r.part_id
    where r.purchase_id=".$purchaseId."
    and r.item_code='".$escapedItemCode."'
    order by r.id
  ");

  if ($partsQuery) {
    while ($partRow = mysqli_fetch_assoc($partsQuery)) {
      $parts[] = array(
        'part_id' => isset($partRow['part_id']) ? (int)$partRow['part_id'] : null,
        'part_qty' => isset($partRow['part_qty']) ? (int)$partRow['part_qty'] : null,
        'part_title' => $partRow['title'],
        'part_brand' => $partRow['item_brand'],
        'part_model' => $partRow['item_model'],
        'part_color' => $partRow['item_color'],
        'part_tac' => $partRow['item_tac']
      );
    }
  }

  return $parts;
}

function quantumRepairBuildPayload($db, $purchaseId, $itemCode, $itemComments, $repairCompleted) {
  $purchaseId = (int)$purchaseId;
  $escapedItemCode = mysqli_real_escape_string($db, $itemCode);
  $payload = array(
    'legacy_purchase_id' => $purchaseId,
    'legacy_imei_id' => null,
    'imei' => $itemCode,
    'tray_id' => null,
    'item_brand' => null,
    'item_details' => null,
    'item_gb' => null,
    'item_grade' => null,
    'item_color' => null,
    'item_comments' => $itemComments,
    'repair_required' => null,
    'repair_completed' => (int)$repairCompleted,
    'parts' => quantumRepairFetchPartsSnapshot($db, $purchaseId, $itemCode),
    'source' => 'quantum',
    'operation' => 'repair_save'
  );

  $deviceQuery = mysqli_query($db, "
    select
    pr.purchase_id,
    pr.item_imei,
    pr.tray_id,
    pr.repair_required,
    pr.repair_completed,
    im.item_grade,
    im.item_color,
    im.item_gb,
    tac.item_brand,
    tac.item_details
    from tbl_purchases as pr
    left join tbl_imei as im
      on im.item_imei = pr.item_imei
    left join tbl_tac as tac
      on tac.item_tac = im.item_tac
    where pr.purchase_id=".$purchaseId."
    and pr.item_imei='".$escapedItemCode."'
    limit 1
  ");

  if ($deviceQuery && mysqli_num_rows($deviceQuery) > 0) {
    $deviceRow = mysqli_fetch_assoc($deviceQuery);
    $payload['tray_id'] = $deviceRow['tray_id'];
    $payload['item_brand'] = $deviceRow['item_brand'];
    $payload['item_details'] = $deviceRow['item_details'];
    $payload['item_gb'] = $deviceRow['item_gb'];
    $payload['item_grade'] = $deviceRow['item_grade'];
    $payload['item_color'] = $deviceRow['item_color'];
    $payload['repair_required'] = isset($deviceRow['repair_required']) ? (int)$deviceRow['repair_required'] : null;
  }

  return $payload;
}

$date = date('Y-m-d');

// echo $date;
// die();

if(isset($_POST['item_code'])){

  for($i=0; $i<count($_POST['item_code']); $i++){

    $check_query = mysqli_query($conn,"select count(distinct id) as id from 
    tbl_repair_imei_products where item_code='".$_POST['item_code'][$i]."' 
    AND purchase_id=".$_POST['purchase_id'])
    or die('Error:: ' . mysqli_error($conn));
    $check = mysqli_fetch_assoc($check_query);
  
    // if items already in REPAIR
    if($check['id'] > 0){
  
      // update repair products details
      $update_query = mysqli_query($conn,"update tbl_repair_imei_products 
      set 
      item_comments ='".$_POST['item_comments'][$i]."'
      where item_code ='".$_POST['item_code'][$i]."' AND 
      purchase_id=".$_POST['purchase_id'])
      or die('Error:: ' . mysqli_error($conn));
  
  
    }
    // items newly already in DB
    else{
      // update repair products details
      $insert_query = mysqli_query($conn,"insert into tbl_repair_imei_products 
      (
      item_comments, 
      item_code, 
      purchase_id,
      user_id) values 
      (
        '".$_POST['item_comments'][$i]."',
        '".$_POST['item_code'][$i]."',
        ".$_POST['purchase_id'].",
        ".$_POST['user_id']."
      )")
      or die('Error:: ' . mysqli_error($conn));
  
    }//else ended

    
    // // UPDATE GRADE IN IMEI
    // $update_grade = mysqli_query($conn,"update tbl_imei set 
    // item_grade =".$_POST['item_grade'][$i]." 
    // where item_imei='".$_POST['item_code'][$i]."'")
    //   or die('Error:: ' . mysqli_error($conn));
  

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
    'IR-".$_POST['purchase_id']."',
    'IMEI REPAIR UPDATED',
    '".$_POST['item_comments'][$i]."',
    '".$date."',
    ".$_POST['user_id'].",
    '".$_POST['item_code'][$i]."'
    )")
    or die('Error:: ' . mysqli_error($conn));

    $repairUpdatedPayload = quantumRepairBuildPayload(
      $conn,
      $_POST['purchase_id'],
      $_POST['item_code'][$i],
      $_POST['item_comments'][$i],
      $_POST['repair_completed'] === 'true' ? 1 : 0
    );

    recordQuantumEvent(
      $conn,
      'repair.updated',
      'device',
      $_POST['item_code'][$i],
      $repairUpdatedPayload,
      __FILE__,
      (string)$_POST['user_id'],
      array((int)$_POST['purchase_id'], $_POST['item_code'][$i], 'repair.updated')
    );
    
  }//FOR LOOP ENDED
  
}

//Complete repair
$is_completed = $_POST['repair_completed'] === 'true' ?1:0;
$complete_query = mysqli_query($conn,"update tbl_purchases set 
repair_completed = ".$is_completed." 
where purchase_id=".$_POST['purchase_id'])
or die('Error:: ' . mysqli_error($conn));

if ($is_completed === 1) {
  $repairEventRows = mysqli_query($conn, "
    select
    pr.purchase_id,
    pr.item_imei,
    rep.item_comments
    from tbl_purchases as pr
    left join tbl_repair_imei_products as rep
      on rep.item_code = pr.item_imei and rep.purchase_id = pr.purchase_id
    where pr.purchase_id=".$_POST['purchase_id']."
    order by pr.id
  ")
  or die('Error:: ' . mysqli_error($conn));

  while ($repairEventRow = mysqli_fetch_assoc($repairEventRows)) {
    $repairCompletedPayload = quantumRepairBuildPayload(
      $conn,
      $repairEventRow['purchase_id'],
      $repairEventRow['item_imei'],
      $repairEventRow['item_comments'],
      1
    );

    recordQuantumEvent(
      $conn,
      'repair.device_completed',
      'device',
      $repairEventRow['item_imei'],
      $repairCompletedPayload,
      __FILE__,
      (string)$_POST['user_id'],
      array((int)$repairEventRow['purchase_id'], $repairEventRow['item_imei'], 'repair.device_completed')
    );
  }
}


print_r($_POST['item_code']);
// echo 'repair success';
