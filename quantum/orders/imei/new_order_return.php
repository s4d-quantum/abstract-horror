<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php require_once "../../shared/quantum_event_outbox.php"; ?>
<?php 

  // NEW order ID
  $new_return_id_query = mysqli_query($conn,"Select max(return_id) from 
  tbl_order_return")
    or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_return_id_query);
  $new_return_id = $order_id_result['max(return_id)'] + 1;

  $curr_date = date("Y-m-d");

  if(isset($_POST['submit_btn'])){
    
    $date = $_POST['order_date'];
    $user_id = $_SESSION['user_id'];
    $customer_id = isset($_GET['cust_id']) ? $_GET['cust_id'] : null;

  // INSERT TO order INVENTORY TBL
  for($i = 0;$i<count($_POST['imei_field']);$i++){
    $imei = $_POST['imei_field'][$i];
    $new_tray_id = $_POST['tray_field'][$i];
    $original_order_id = null;
    $previous_tray_id = null;
    $supplier_id = null;

    $fetch_order_query = mysqli_query($conn,"select order_id from tbl_orders 
      where 
      item_imei='".$imei."' and 
      order_return = 0 
      order by id desc")
      or die('Error:: '.mysqli_error($conn));
    $order_row = mysqli_fetch_assoc($fetch_order_query);
    $order_id = $order_row ? $order_row['order_id'] : null;
    $original_order_id = $order_id ? (int)$order_id : null;

    $purchase_query = mysqli_query($conn,"select tray_id, supplier_id from tbl_purchases
      where item_imei ='".$imei."'
      order by id desc
      limit 1")
      or die('Error:: '.mysqli_error($conn));
    $purchase_row = mysqli_fetch_assoc($purchase_query);
    $previous_tray_id = $purchase_row ? $purchase_row['tray_id'] : null;
    $supplier_id = $purchase_row ? $purchase_row['supplier_id'] : null;

    // Add into TAC table
      $new_order_return = mysqli_query($conn,"insert into tbl_order_return 
      (
      item_imei,
      date, 
      return_id, 
      user_id,
      order_id
      ) 
      values(
      '".$imei."',
      '".$date."',
      '".$new_return_id."',
      ".$user_id.",
      '".$order_id."')")
      or die('Error:: '.mysqli_error($conn));

      // update status in item_imei
      $new_imei = mysqli_query($conn,"update tbl_imei set status=1, in_sales_order = NULL
      where item_imei ='".$imei."'") 
      or die('Error:: ' . mysqli_error($conn));

      // update tray_id in tbl_purchases 
      $update_purchase = mysqli_query($conn,"update tbl_purchases set tray_id='".$new_tray_id."'
      where item_imei ='".$imei."'") 
      or die('Error:: ' . mysqli_error($conn));

      // update tbl orders 
      $new_order_imei = mysqli_query($conn,"update tbl_orders set 
      order_return=1
      where item_imei ='".$imei."' and 
      order_id='".$order_id."'") 
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
        'IOR-".$new_return_id."',
        'IMEI ORDER RETURN',
        'QTY:1',
        '".$date."',
        ".$user_id.",
        '".$imei."'
        )")
        or die('Error:: ' . mysqli_error($conn));

      $payload = array(
        'legacy_return_id' => (int)$new_return_id,
        'legacy_goodsout_order_id' => $original_order_id,
        'legacy_sales_order_id' => null,
        'imei' => $imei,
        'customer_id' => $customer_id,
        'supplier_id' => $supplier_id,
        'old_tray_id' => $previous_tray_id,
        'new_tray_id' => $new_tray_id,
        'return_date' => $date,
        'source' => 'quantum',
        'operation' => 'sales_order_return_submit'
      );

      recordQuantumEvent(
        $conn,
        'sales.return_created',
        'device',
        $imei,
        $payload,
        __FILE__,
        isset($_SESSION['user_id']) ? (string)$_SESSION['user_id'] : null,
        array((int)$new_return_id, $imei)
      );

    } //loop ended

    header("location:order_return_details.php?ord_id=".$new_return_id."&email=1");

  }//if ended

?>
<?php include "../../header.php";?>

   <span class="customer_id hidden"><?php echo $_GET['cust_id']; ?></span>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Order Return #IOR-<?php echo $new_return_id;?>
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">
        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">

              <form enctype="multipart/form-data" method="post" id="confirm_order" action="">
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <label for="" class="col col-md-4 col-sm-6">
                      Date
                      <input type="text" name="order_date" class="form-control order_date" 
                      id="order_date" value="<?php echo $curr_date; ?>">
                    </label>

                    <label for="" class="col col-md-4 col-sm-6">
                      Customer
                      <div style="font-weight:normal;">
                    <?php 
                      $fetch_customers = mysqli_query($conn,"select name from 
                      tbl_customers where customer_id='".$_GET['cust_id']."'");
                      $customer = mysqli_fetch_assoc($fetch_customers);
                      echo $customer['name']; 
                      ?>
                    </div>
                    </label>

                  </div>
                  <!-- /.box-body -->
                </div>

                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Items</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="items_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>IMEI</th>
                          <th>Model/Details</th>
                          <th>Brand</th>
                          <th>Color</th>
                          <th>GBs</th>
                          <th>Tray#</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <div class="form-group">
                              <input type="text"   class="form-control imei-field" name="imei_field[]" required >
                              <span class="help-block"></span>
                            </div>
                          </td>
                          <td>
                          <input type="text" class="form-control details-field" name="details_field[]" >
                          <input type="text" class="hide form-control order_id" name="order_id[]">
                          </td>
                          <td>
                            <input type="text" class="form-control brand-field" name="brand_field[]">
                          </td>
                          <td>
                            <input type="text" class="form-control color-field" name="color_field[]">
                          </td>
                          <td>
                            <input type="text" class="form-control gb-field" name="gb_field[]">
                          </td>
                          <td>
                            <select class='form-control tray-field' name='tray_field[]' >
                              <?php 
                                $fetch_trays = mysqli_query($conn,"select * from tbl_trays");
                                while($item = mysqli_fetch_assoc($fetch_trays)):?>
                                  <option value="<?php echo $item['tray_id'];?>"><?php echo $item['title']; ?></option>
                                <?php endwhile;?>
                            </select>
                          </td>
                          <td></td>
                        </tr>
                        <tr class="add-new-row">
                          <td colspan="7">
                            <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> New Item</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <hr>
                    <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
                    <input type="submit" name="submit_btn" class="pull-right btn btn-success btn-lg submit-form">
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
                </form>
              </div>
            </div>
          </section>
        </div> <!-- col -->

      </div>
      <!-- /.row -->
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->

  <!-- duplicate beep -->
  <audio id="duplicate-beep">
    <source src="../../duplicate-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /duplicate beep -->

  <!-- outofstock beep -->
  <audio id="outofstock-beep">
    <source src="../../outofstock-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /outofstock beep -->

  <select class="hide tray_collection no-print">
    <?php
      // fetch trays
      $fetch_trays1 = mysqli_query($conn,"select * from tbl_trays");
      while($tray = mysqli_fetch_assoc($fetch_trays1)):
    ?>
      <option value="<?php echo $tray['tray_id'];?>">
        <?php echo $tray['title'];?>        
      </option>
    <?php endwhile;?>
  </select>


<?php include $global_url."footer.php";?>
<script src="order_return_script.js"></script>
<script type="text/javascript">

  $('#order_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });
  
</script>
</body>
</html>
