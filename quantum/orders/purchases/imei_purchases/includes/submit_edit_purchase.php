<?php include '../../../db_config.php';  ?>
<?php

  $new_pur_id = $_POST['purchase_id'];
  $curr_date = date("Y-m-d");

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
  }//for loop ended