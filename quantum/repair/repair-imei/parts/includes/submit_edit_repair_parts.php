<?php include '../../../../db_config.php';  ?>
<?php


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
      
  // print json_encode(array(
  //   'hello' => $hello 
  // ));
