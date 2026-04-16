<?php include '../../../db_config.php';  ?>
<?php


  $customer = $_POST['customer'];
  $supplier = $_POST['supplier'];
  $po_ref = $_POST['po_ref'];
  $user_id = $_POST['user_id'];
  $new_ord_id = $_POST['order_id'];
  $date = date('Y-m-d');

    // DELETE PREV ADDED ITEMS 
    $delete_prev_order_items = mysqli_query($conn,"delete from tbl_serial_sales_orders where 
    order_id=".$new_ord_id)
    or die('Error:: ' . mysqli_error($conn));
  
    // ============= 
    // ADD NEW DATA
    // ============= 

    // INSERT TO SERIAL SALES ORDERS
    for($i = 0;$i<count($_POST['tray_id']);$i++){
  
      $new_purchase = mysqli_query($conn,"insert into tbl_serial_sales_orders (
        order_id,
        date,
        po_ref,
        customer_id,
        supplier_id,
        user_id,
        item_brand,
        item_details,
        item_grade,
        tray_id,
        item_code,
        is_completed
        )
        values(
        $new_ord_id,
        '".$date."',
        '".$po_ref."',
        '".$customer."',
        '".$supplier[$i]."',
        '".$user_id."',
        '".$_POST['item_brand'][$i]."',
        '".$_POST['item_details'][$i]."',
        '".$_POST['item_grade'][$i]."',
        '".$_POST['tray_id'][$i]."',
        '".$_POST['item_code'][$i]."',
        0)")
        or die('Error:: ' . mysqli_error($conn));

        // ITEM LOG
        $new_log = mysqli_query($conn,"insert into tbl_log (
          ref,
          subject,
          date, 
          user_id
          )
          values
          (
          '".'SO-'.$new_ord_id."',
          'UPDATED SALES ORDER',
          '".$date."',
          ".$user_id."
          )")
          or die('Error:: ' . mysqli_error($conn));
  
    }
      
    print json_encode($_POST);
