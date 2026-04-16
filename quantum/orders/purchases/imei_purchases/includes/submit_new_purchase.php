<?php include '../../../db_config.php';  ?>
<?php


  // NEW PURCHASE ID
  $new_pur_id_query = mysqli_query($conn,"Select max(purchase_id) from tbl_purchases")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
  $new_pur_id = ($order_id_result['max(purchase_id)']+1);

  $date = str_replace("/", "-", $_POST['purchase_date']);
  $user_id = $_POST['user_id'];

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

    }//for loop ended

    echo $new_pur_id;
