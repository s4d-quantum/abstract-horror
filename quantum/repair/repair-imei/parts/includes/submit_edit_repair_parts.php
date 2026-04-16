<?php include '../../../../db_config.php';  ?>
<?php require_once '../../../../shared/quantum_event_outbox.php'; ?>
<?php

function quantumRepairPartsFetchSnapshot($db, $purchaseId, $itemCode) {
  $purchaseId = (int)$purchaseId;
  $escapedItemCode = mysqli_real_escape_string($db, $itemCode);
  $parts = array();
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
    'item_comments' => null,
    'repair_required' => null,
    'repair_completed' => null,
    'parts' => array(),
    'source' => 'quantum',
    'operation' => 'repair_parts_submit'
  );

  $deviceQuery = mysqli_query($db, "
    select
    pr.purchase_id,
    pr.item_imei,
    pr.tray_id,
    pr.repair_required,
    pr.repair_completed,
    rep.item_comments,
    im.item_grade,
    im.item_color,
    im.item_gb,
    tac.item_brand,
    tac.item_details
    from tbl_purchases as pr
    left join tbl_repair_imei_products as rep
      on rep.item_code = pr.item_imei and rep.purchase_id = pr.purchase_id
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
    $payload['item_comments'] = $deviceRow['item_comments'];
    $payload['repair_required'] = isset($deviceRow['repair_required']) ? (int)$deviceRow['repair_required'] : null;
    $payload['repair_completed'] = isset($deviceRow['repair_completed']) ? (int)$deviceRow['repair_completed'] : null;
  }

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

  $payload['parts'] = $parts;

  return $payload;
}


  $item_code = $_POST['item_code'];
  $purchase_id = $_POST['purchase_id'];
  $user_id = $_POST['user_id'];
  $date = date('Y-m-d');


  // EDIT CODE 
  // Fetch prev existed items from tbl_repair_imei_parts and revert them before making new changes 
  $fetch_prev_items = mysqli_query($conn,"select 
  item_code, 
  part_id, 
  part_qty, 
  purchase_id 

  from tbl_repair_imei_parts 
    where purchase_id ='".$purchase_id."' AND item_code='".$item_code."'")
    or die('Error:: ' . mysqli_error($conn));

  // IF ALREADY DATA EXISTS (MEANS EDITING)
  if(mysqli_num_rows($fetch_prev_items) > 0){
    $prev_items = array();
    while($t = mysqli_fetch_assoc($fetch_prev_items)){      
      $prev_items[] = array(
        'part_id'=> $t['part_id'],
        'part_qty'=> $t['part_qty']
      );

      // Add back items to inventory 
      $update_invt = mysqli_query($conn,"update tbl_parts_products set 
      item_qty = item_qty + ".$t['part_qty']." 
    
      WHERE id ='".$t['part_id']."'")
        or die('Error:: ' . mysqli_error($conn));
  
    }  

    // DELETE PREV ADDED ITEMS 
    $delete_prev_order_items = mysqli_query($conn,"delete from tbl_repair_imei_parts where 
    purchase_id=".$purchase_id." AND item_code='".$item_code."'")
    or die('Error:: ' . mysqli_error($conn));

  }  

  // ============= 
  // ADD NEW DATA
  // ============= 

  $hello="outside";
  if(isset($_POST['part_id'])){

    $hello="insdie";

    // INSERT TO IMEI SALES ORDERS
    for($i = 0;$i<count($_POST['part_id']);$i++){
      $new_purchase = mysqli_query($conn,"insert into tbl_repair_imei_parts (
        purchase_id,
        item_code,
        part_id,
        part_qty,
        user_id
        )
        values(
        ".$purchase_id.",
        '".$item_code."',
        '".$_POST['part_id'][$i]."',
        ".$_POST['part_qty'][$i].",
        '".$user_id."'
        )")
        or die('Error:: ' . mysqli_error($conn));

        $update_invt = mysqli_query($conn,"update tbl_parts_products set 
        item_qty = item_qty - ".$_POST['part_qty'][$i]." WHERE id ='".$_POST['part_id'][$i]."' ")
          or die('Error:: ' . mysqli_error($conn));

          // ITEM LOG
          $new_log = mysqli_query($conn,"insert into tbl_log (
            item_code,
            ref,
            subject,
            details,
            date, 
            user_id
            )
            values
            (
            '".$_POST['part_id'][$i]."',
            'IRP-".$purchase_id."',
            'IMEI REPAIR PARTS UPDATED',  
            'QTY:".$_POST['part_qty'][$i]."',
            '".$date."',
            ".$user_id."
            )")
          or die('Error:: ' . mysqli_error($conn));
  
    }      
  }

  $repairPartsPayload = quantumRepairPartsFetchSnapshot($conn, $purchase_id, $item_code);

  recordQuantumEvent(
    $conn,
    'repair.updated',
    'device',
    $item_code,
    $repairPartsPayload,
    __FILE__,
    (string)$user_id,
    array((int)$purchase_id, $item_code, 'repair.parts')
  );
      
  // print json_encode(array(
  //   'hello' => $hello 
  // ));
