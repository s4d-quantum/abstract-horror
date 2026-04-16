<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

  // NEW order ID
  $new_order_id_query = mysqli_query($conn,"Select max(ref_id) from tbl_non_imei_order_return")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_order_id_query);
  $new_return_id = 'ORT'.($order_id_result['max(ref_id)']+1);


  // *********
  // SUBMIT order
  // *********

  // order TABLE INVENTORY
  if(isset($_POST['submit_order'])){

    $date = date('Y-m-d');
   
    // INSERT TO order INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

        // INSERT TO ORDER RETURN TBL
        $new_order_query = mysqli_query($conn,"insert into 
        tbl_non_imei_order_return 
        (item_code,date,return_id, item_qty) values(
        '".$_POST['item_code'][$i]."','".$date."','".$new_return_id."',
        ".$_POST['item_qty'][$i].")")
        or die('Error:: ' . mysqli_error($conn));

        // update tbl_no_imei_orders
        $new_order_query = mysqli_query($conn,"update tbl_non_imei_orders 
        set order_return = 1 where item_code = '".$_POST['item_code'][$i]."'")
        or die('Error:: ' . mysqli_error($conn));

        // update item qty
        $new_imei = mysqli_query($conn,"update tbl_non_imei_products set 
        item_qty = item_qty + ".$_POST['item_qty'][$i]." 
        where item_code ='".$_POST['item_code'][$i]."'") 
        or die('Error:: ' . mysqli_error($conn));
  
    }//LOOP ENDED

    header("location:non_imei_order_return_history.php");

  }

?>

<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Order Return
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- col -->
      <form enctype="multipart/form-data" method="post" id="confirm_order" action="">

      <!-- col -->
       <div class="col-md-12">
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
                    item_code" required>
                            <span class="help-block"></span>
                        </div>
                      </td>
                      <td>
                        <input type="text" name="item_brand[]"  placeholder="Item brand" 
                        class="form-control item_brand" >
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
                        <p class="item_qty_label"><?php echo ''; ?></p>
                        <input type="number" name="item_qty[]"  placeholder="Item qty" 
                        class="hidden form-control item_qty">
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
        <input type="submit" name="submit_order" class="submit-form btn btn-success btn-lg pull-right" 
        value="Confirm Return" id="submit_order">
      </div>

      </form>
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->

  </div>
  <!-- /.content-wrapper -->




<!-- jQuery 2.2.3 -->
<script src="<?php echo $global_url;  ?>assets/js/jquery-ui.min.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/app.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/dashboard.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/demo.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/chart.min.js"></script>
<!-- Bootstrap 3.3.6 -->
<script src="<?php echo $global_url;  ?>assets/js/bootstrap.min.js"></script>
<script src="<?php echo $global_url ?>assets/js/select2.min.js"></script>
<!-- page script -->
<script src="<?php echo $global_url ?>orders/non_imei_order_return_script.js"></script>
</body>
</html>

