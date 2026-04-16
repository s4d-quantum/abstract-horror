<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // NEW RETURN
  $new_return_id_query = mysqli_query($conn,"Select max(return_id) from 
  tbl_serial_order_return")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_return_id_query);
  $new_id = ($order_id_result['max(return_id)'] + 1);
  $new_return_id = $new_id;
  
  // *********
  // SUBMIT order
  // *********

  $date = date('Y-m-d');
  // order TABLE INVENTORY
  if(isset($_POST['submit_order'])){

    $user_id = $_SESSION['user_id'];


    // INSERT TO order INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){
    
      $fetch_order_query = mysqli_query($conn,"select order_id from tbl_serial_orders 
      where 
      item_code='".$_POST['item_code'][$i]."' and 
      order_return = 0 
      order by id desc")
      or die('Error:: '.mysqli_error($conn));
      $order_id = mysqli_fetch_assoc($fetch_order_query)['order_id'];

      // INSERT TO order TBL
      $new_order_query = mysqli_query($conn,"insert into 
      tbl_serial_order_return 
      (
        item_code,
        date,
        return_id,
        user_id,
        order_id
      ) values(
      '".$_POST['item_code'][$i]."',
      '".$date."',
      ".$new_return_id.",
      ".$user_id.",
      ".$order_id.")")
      or die('Error:: ' . mysqli_error($conn));


      
      
      $new_code = mysqli_query($conn,"update tbl_serial_products set 
      status=1 where 
      item_code ='".$_POST['item_code'][$i]."'") 
      or die('Error:: ' . mysqli_error($conn));

      $update_order = mysqli_query($conn,"update tbl_serial_orders set 
      order_return=1 where 
      item_code ='".$_POST['item_code'][$i]."' AND 
      order_id='".$order_id."'") 
      or die('Error:: ' . mysqli_error($conn));


      // update tray_id in tbl_serial_purchases 
      $update_tray = mysqli_query($conn,"update tbl_serial_purchases set 
      tray_id='".$_POST['tray_field'][$i]."'
      where item_code ='".$_POST['item_code'][$i]."'") 
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
      'SOR-".$new_return_id."',
      'NEW SERIAL ORDER RETURN',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$_POST['item_code'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));

  }//LOOP ENDED

    header("location:serial_order_return_details.php?ord_id=".$new_return_id."&email=1");

  }

?>
<?php include "../../header.php" ?>

  <span class="customer_id hidden"><?php echo $_GET['cust_id']; ?></span>
  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New order Return
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
            <label for="" class="col col-md-4 col-sm-6">
              Date
              <input type="text" name="order_date" class="form-control order_date" 
              id="order_date" value="<?php echo $date; ?>">
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
                      <th>Details</th>
                      <th>Tray#</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div class="form-group">
                            <input type="text" required 
                            name="item_code[]" placeholder="Item code" class="form-control 
                    item_code" >
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
                        <input type="text" name="item_details[]" placeholder="Item details" 
                        class="form-control item_details">
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
                      <td>
                      </td>
                    </tr>
                    <tr class="hide add_new_row">
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
        <input type="submit" name="submit_order" class="submit-form btn btn-success btn-lg pull-right" 
        value="Confirm order" id="submit_order">
      </div>

      </form>
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
<script src="serial_order_return_script.js"></script>
</body>
</html>

