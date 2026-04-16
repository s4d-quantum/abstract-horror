<?php include '../../../db_config.php';  ?>
<?php

    $new_pur_id = $_POST['purchase_id'];
    $new_date = date('Y-m-d');

    // fetch purchase details
    $fetch_purchase_query = mysqli_query($conn,"select * from tbl_serial_purchases where 
    purchase_id=".$new_pur_id);
    $fetch_purchase = mysqli_fetch_assoc($fetch_purchase_query);

    $date = $fetch_purchase['date'];
    $supplier_id = $_POST['purchase_supplier'];
    $user_id = $_POST['user_id'];
    $priority = is_null($fetch_purchase['priority']) ? 0 : $fetch_purchase['priority'];
    $has_return_tag = is_null($fetch_purchase['has_return_tag']) ? 0 :$fetch_purchase['has_return_tag'];
    $unit_confirmed = is_null($fetch_purchase['unit_confirmed']) ? 0 :$fetch_purchase['unit_confirmed'];
  

    /* 
      1 - Fetch all previous items and match with each new items, 
      2 - if any previous item does not match, remove it, and those which 
        match, update all those 
      3 - if any item from new items does not match, Add it, 
    */

    /* 1 - fetch prev items */
    $fetch_prev_items = mysqli_query($conn,"select item_code from tbl_serial_purchases 
      where purchase_id =".$new_pur_id)
      or die('Error:: ' . mysqli_error($conn));

    $prev_items = array();
    while($t = mysqli_fetch_assoc($fetch_prev_items)){
      $prev_items[] = array(
        'item_code'=> $t['item_code']
      );
    }
  
    /* 2 - if any previous item does not match, remove it */
    $isMatched = 0;
    // echo json_encode($prev_items[$i]['item_code']);
    for($i = 0;$i<count($prev_items);$i++){
      for($j = 0;$j<count($_POST['item_code']);$j++){

        if($prev_items[$i]['item_code'] === $_POST['item_code'][$j]){
          $isMatched = 1;
          
          // update item details with new details
          $update_item = mysqli_query($conn,"update tbl_serial_purchases 
          set 
          supplier_id = '".$_POST['purchase_supplier']."',
          date = '".$date."',
          qc_required = ".$_POST['qc_required'].",
          qc_completed = 0,
          user_id = '".$user_id."',
          tray_id = '".$_POST['tray_id'][$j]."',
          purchase_return = ".$_POST['purchase_return'][$j].",
          priority = ".$priority.", 
          po_ref = '".$_POST['po_ref']."',
          unit_confirmed=".$unit_confirmed.",
          has_return_tag=".$has_return_tag."
            where item_code='".$_POST['item_code'][$j]."' and purchase_id=".$new_pur_id)
          or die('Error:: ' . mysqli_error($conn));

          break;
          // echo 'matched!!';
        }
      }
      // if this prev item does not matched with new items, delete it
      if($isMatched === 0){
        // del from tbl_serial_purchases 
        $del_prev_item= mysqli_query($conn,"delete from tbl_serial_purchases where 
        item_code = '".$prev_items[$i]['item_code']."' and purchase_id='".$new_pur_id."'")
        or die('Error:: ' . mysqli_error($conn));

        // chnage item status to 0
        $serial_status= mysqli_query($conn,"update tbl_serial_products set status = 0 where 
        item_code = '".$prev_items[$i]['item_code']."' and purchase_id='".$new_pur_id."'")
        or die('Error:: ' . mysqli_error($conn));

        // remove from tbl_qc_serial_products (even if item does not exist it wont give error)
        $qc_update= mysqli_query($conn,"delete from tbl_qc_serial_products where 
        item_code = '".$prev_items[$i]['item_code']."' and purchase_id='".$new_pur_id."'")
        or die('Error:: ' . mysqli_error($conn));

        // deleted item log
        $deleted_item_log = mysqli_query($conn,"insert into tbl_log (
          ref,
          subject,
          details,
          date, 
          user_id,
          item_code
          )
          values
          (
          'SP-".$new_pur_id."',
          'DELETED FROM EDIT SERIAL PURCHASE',
          'QTY:1',
          '".$new_date."',
          ".$user_id.",
          '".$prev_items[$i]['item_code']."'
          )")
          or die('Error:: ' . mysqli_error($conn));

      }
      $isMatched = 0; //set ismatched back to 0 for next iteration        
    }


    /* 3 - if any item from new items does not match, Add it, */
    $isMatched = 0;
    for($i = 0;$i<count($_POST['item_code']);$i++){
      for($j = 0;$j<count($prev_items);$j++){
        if($prev_items[$j]['item_code'] === $_POST['item_code'][$i]){
          $isMatched = 1;
        }
      }
      // if no new item matched, means its newly added, add it
      if($isMatched === 0){
        $add_new_item = mysqli_query($conn,"insert into tbl_serial_purchases (
          purchase_id,
          supplier_id,
          date,
          qc_required,
          qc_completed,
          user_id,
          tray_id,
          purchase_return,
          item_code,
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
            '".$_POST['item_code'][$i]."',
            ".$priority.",
            '".$_POST['po_ref']."',
            $has_return_tag,
            $unit_confirmed
            )")
          or die('Error:: ' . mysqli_error($conn));
        }
      $isMatched = 0; //set ismatched back to 0 for next iteration        
    }
  

    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

    // =============
      // Search if SERIAL is new or already existed before and returned?
      // =============
      $existing_serial = mysqli_query($conn,"select count(*) as count 
      from tbl_serial_products where 
      item_code='".$_POST['item_code'][$i]."'")
      or die('Error:: ' . mysqli_error($conn));
      $is_existing_serial = mysqli_fetch_assoc($existing_serial)['count'];

      if($is_existing_serial > 0){
        // NEW imei entry
        $update_serial_product = mysqli_query($conn,"update tbl_serial_products 
          set 
          purchase_id = '".$new_pur_id."',
          item_details='".trim($_POST['item_details'][$i])."',
          item_grade = '".$_POST['item_grade'][$i]."',
          item_brand = '".$_POST['item_brand'][$i]."', 
          status = ".$_POST['status'][$i]."
          where item_code = '".$_POST['item_code'][$i]."'")
          or die('Error:: ' . mysqli_error($conn));

      }
      else{

          // Add new serial
        $purchase_serial = mysqli_query($conn,"insert into tbl_serial_products (
          purchase_id,
          item_code,
          item_grade,
          status,
          item_details,
          item_brand
          )
          values(
          '".$new_pur_id."',
          '".$_POST['item_code'][$i]."',
          '".$_POST['item_grade'][$i]."',
          1,
          '".trim($_POST['item_details'][$i])."',
          '".$_POST['item_brand'][$i]."'
          )")
        or die('Error:: ' . mysqli_error($conn));

      } //else ended

    
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
      'SP-".$new_pur_id."',
      'EDIT SERIAL PURCHASE',
      'QTY:1',
      '".$new_date."',
      ".$user_id.",
      '".$_POST['item_code'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));

    } //for loop ended

    echo $new_pur_id;