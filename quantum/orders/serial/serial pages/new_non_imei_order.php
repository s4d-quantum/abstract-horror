<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../"; ?>
<?php 


  // DISPLAYING SUPPLIERS
  $fetch_customers = mysqli_query($conn,"select * from tbl_customers");

  // NEW order ID
  $new_order_id_query = mysqli_query($conn,"Select max(ref_id) from tbl_log where 
  ref LIKE 'AIOR%'")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_order_id_query);
  $new_ord_id = $order_id_result['max(ref_id)'] + 1;

  $curr_date = date("Y-m-d");

  // *********
  // SUBMIT order
  // *********

  // order TABLE INVENTORY
  if(isset($_POST['submit_order'])){

    $date = date('Y-m-d');
    $customer_id = $_POST['order_customer'];
   
    // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (ref,details)
      values
      ('".'AIOR'.$new_ord_id."','NEW NON-IMEI ORDER')")
      or die('Error:: ' . mysqli_error($conn));

    // INSERT TO order INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

        // INSERT TO order TBL
        $new_order_query = mysqli_query($conn,"insert into 
        tbl_non_imei_orders 
        (item_code,date,order_id,customer_id,order_return,item_qty,
        po_box,delivery_company,total_boxes,total_pallets) values(
        '".$_POST['item_code'][$i]."','".$date."',
        '".$new_ord_id."','".$customer_id."',0,".$_POST['item_qty'][$i].",
        '".$_POST['po_box']."','".$_POST['delivery_company']."',
        ".$_POST['total_boxes'].",".$_POST['total_pallets'].")")
        or die('Error:: ' . mysqli_error($conn));

        $new_imei = mysqli_query($conn,"update tbl_non_imei_products set status=0, 
        item_qty = item_qty - ".$_POST['item_qty'][$i]." 
        where item_code ='".$_POST['item_code'][$i]."'") 
        or die('Error:: ' . mysqli_error($conn));
  
    }//LOOP ENDED

    header("location:non_imei_order_details.php?ord_id=".$new_ord_id."&email=1&excel=1");

  }

?>

<?php include "../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Order
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- col -->
      <form enctype="multipart/form-data" method="post" id="confirm_order" action="">

      <!-- col -->
       <div class="col-md-12">

        <div class="box">
          <div class="box-header">
            <h3 class="box-title">Details</h3>
          </div>
          <!-- /.box-header -->
          <div class="box-body">
            
          <div class="row">
            <label for="" class="col col-md-4 col-sm-6">
              Date
              <input type="text" name="order_date" class="form-control order_date" 
              value="<?php echo $curr_date; ?>" id="order_date">
            </label>
            <div class="form-group col col-md-4 col-sm-6">
              <label>Select customer</label>
              <select required class="form-control" name="order_customer">
                <option value="">Select customer</option>
                <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
                <option value="<?php echo $row['customer_id']; ?>">
                <?php echo $row['name']; ?> </option>
              <?php endwhile; ?>
              </select>
            </div>
          </div>

            <div class="row">

              <div class="po-box col-md-3 col-sm-4">
                <label for="">Total # of Boxes</label>
                <input type="text" name="total_boxes" class="form-control">
              </div>

              <div class="po-box col-md-3 col-sm-4">
                <label for="">Total # of Pallets</label>
                <input type="text" name="total_pallets" class="form-control">
              </div>

              <!-- PO Box -->
              <div class="po-box col-md-3 col-sm-4">
                <label for="">PO Reference</label>
                <input type="text" name="po_box" class="form-control">
              </div>

              <!-- Delivery Company -->
              <div class="deliver-company col-md-3 col-sm-4">
                <label for="">Delivery Company</label>
                <input type="text" name="delivery_company" class="form-control">
              </div>
            </div>

          </div>
          <!-- /.box-body -->
        </div>

          <div class="box box-success">
            <div class="box-header">
              <h3 class="box-title">Select Items</h3>
            </div>
            <div class="box-body">
              <table class="table" id="order_items">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Brand</th>
                      <th>Qty</th>
                      <th>Details</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div class="form-group">
                            <input type="text" name="item_code[]" placeholder="Item code" class="form-control 
                    item_code" required >
                            <span class="help-block"></span>
                        </div>
                      </td>
                      <td>
                        <input type="text" name="item_brand[]" placeholder="Item brand" 
                        class="form-control item_brand">
                        <select class="brands hidden">
                          <?php 
                            $fetch_brands = mysqli_query($conn,"select * from tbl_categories");
                            while($row = mysqli_fetch_assoc($fetch_brands)):
                          ?>
                          <option value="<?php echo $row['category_id'];?>"><?php echo $row['title'];?></option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <input type="number" name="item_qty[]"  placeholder="Item qty" 
                        class="form-control item_qty">
                        Available: <span class="available_qty"></span>
                      </td>
                      <td>
                        <input type="text" name="item_details[]"  placeholder="Item details" 
                        class="form-control item_details">
                      </td>
                      <td>
                        <!-- <button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>   -->
                      </td>
                    </tr>
                    <tr class="add_new_row">
                      <td colspan="5">
                        <button type="button" class="btn btn-primary btn-block add_row">
                          <i class="fa fa-plus"></i> &nbsp;Add Item
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>
          </div>
        </div>
        <!-- /.col -->

      <div class="col-md-12">
        <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
        <input type="submit" name="submit_order" class="btn btn-success btn-lg pull-right submit_order" value="Confirm Order">
      </div>

      </form>
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->

  </div>
  <!-- /.content-wrapper -->


  <!-- error beep -->
  <audio id="myAudio">
    <source src="../error-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /error beep -->


<!-- jQuery 2.2.3 -->
<script src="<?php echo $global_url;  ?>assets/js/jquery-ui.min.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/app.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/dashboard.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/demo.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/chart.min.js"></script>
<!-- Bootstrap 3.3.6 -->
<script src="<?php echo $global_url;  ?>assets/js/bootstrap.min.js"></script>
<script src="<?php echo $global_url ?>assets/js/select2.min.js"></script>
<script src="<?php echo $global_url; ?>assets/js/bootstrap-datepicker.js"></script>
<script>
  // date picker
  $('#order_date').datepicker({
      autoclose: true,
    format:'yyyy/mm/dd'
  });
</script>

<script src="<?php echo $global_url ?>orders/non_imei_order_script.js"></script>
<!-- page script -->
</body>
</html>

