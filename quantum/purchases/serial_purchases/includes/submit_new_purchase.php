<?php include '../../../db_config.php';  ?>
<?php

    // NEW PURCHASE ID
    $new_pur_id_query = mysqli_query($conn,"Select max(purchase_id) from tbl_serial_purchases")
    or die('Error:: ' . mysqli_error($conn));
    $order_id_result = mysqli_fetch_assoc($new_pur_id_query);
    $new_pur_id = $order_id_result['max(purchase_id)'] + 1;

    $date = str_replace("/", "-", $_POST['purchase_date']);
    $supplier_id = $_POST['purchase_supplier'];
    $user_id = $_POST['user_id'];

    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

      // INSERT TO PURCHASE TBL
      $new_purchase_query = mysqli_query($conn,"insert into tbl_serial_purchases (
        purchase_id,
        supplier_id,
        date,
        qc_required,
        qc_completed,
        user_id,
        tray_id,
        purchase_return,
        item_code,
        po_ref,
        priority,
        unit_confirmed,
        has_return_tag) values(
          '".$new_pur_id."',
          '".$supplier_id."',
          '".$date."',".
          $_POST['qc_required'].",
          0,
          ".$user_id.",
          '".trim($_POST['tray_id'][$i])."',
          0,
          '".$_POST['item_code'][$i]."',
          '".$_POST['po_ref']."',
          0,
          0,
          0
          )")
        or die('Error:: ' . mysqli_error($conn));

      // =============
        // Search if ITEM is new or already existed before and returned?
        // =============
        $existing_imei = mysqli_query($conn,"select count(*) as count from 
        tbl_serial_products where 
        item_code='".$_POST['item_code'][$i]."'")
        or die('Error:: ' . mysqli_error($conn));
        $is_existing_imei = mysqli_fetch_assoc($existing_imei)['count'];

        if($is_existing_imei > 0){
          // NEW imei entry
          $update_serial_product = mysqli_query($conn,"update tbl_serial_products 
            set 
            purchase_id = '".$new_pur_id."',
            item_details='".trim($_POST['details_field'][$i])."',
            item_grade = '".trim($_POST['grade_field'][$i])."',
            item_brand = '".trim($_POST['brand_field'][$i])."', 
            status = 1
            where item_code = '".$_POST['item_code'][$i]."'")
            or die('Error:: ' . mysqli_error($conn));
        }
        else{
          // NEW PRODUCT 
          $new_product_query = mysqli_query($conn,"insert into tbl_serial_products 
          (
            purchase_id,
            item_code,
            item_grade,
            item_brand,
            item_details,
            status) values 
          (
            '".$new_pur_id."',
            '".$_POST['item_code'][$i]."',
            '".$_POST['grade_field'][$i]."',
            '".$_POST['brand_field'][$i]."',
            '".trim($_POST['details_field'][$i])."',
            1)")
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
        '".'SP-'.$new_pur_id."',
        'NEW SERIAL PURCHASE',
        'QTY:1',
        '".$date."',
        ".$user_id.",
        '".$_POST['item_code'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));

    }//LOOP ENDED

    echo $new_pur_id;