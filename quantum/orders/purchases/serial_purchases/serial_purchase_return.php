<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // NEW RETURN
  $new_return_id_query = mysqli_query($conn,"Select max(return_id) from 
  tbl_serial_purchase_return")
  or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_return_id_query);
  $new_id = ($order_id_result['max(return_id)'] + 1);
  $new_return_id = $new_id;
  
  // *********
  // SUBMIT PURCHASE
  // *********
  $date = date('Y-m-d');

  // PURCHASE TABLE INVENTORY
  if(isset($_POST['submit_purchase'])){

    $user_id = $_SESSION['user_id'];

    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0;$i<count($_POST['item_code']);$i++){

      // Fetch purchase_id for each item
      $fetch_purchase_query = mysqli_query($conn,"select purchase_id from 
        tbl_serial_purchases 
        where 
        item_code='".$_POST['item_code'][$i]."' and 
        purchase_return = 0 
        order by id desc")
        or die('Error:: '.mysqli_error($conn));
      $purchase_id = mysqli_fetch_assoc($fetch_purchase_query)['purchase_id'];

      // INSERT TO PURCHASE TBL
      $new_purchase_query = mysqli_query($conn,"insert into 
      tbl_serial_purchase_return 
      (
        item_code,
        date,
        return_id,
        user_id,
        purchase_id
      ) values(
      '".$_POST['item_code'][$i]."',
      '".$date."',
      '".$new_return_id."',
      ".$user_id.",
      '".$purchase_id."')")
      or die('Error:: ' . mysqli_error($conn));

      // update product
      $new_imei = mysqli_query($conn,"update tbl_serial_products set 
      status=0 where 
      item_code ='".$_POST['item_code'][$i]."'") 
      or die('Error:: ' . mysqli_error($conn));

      // update purchases
      $update_purchase = mysqli_query($conn,"update tbl_serial_purchases set 
      purchase_return=1 where 
      item_code ='".$_POST['item_code'][$i]."' and 
      purchase_id='".$purchase_id."'") 
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
        'SPR-".$new_return_id."',
        'NEW SERIAL PURCHASE RETURN',
        'QTY:1',
        '".$date."',
        ".$user_id.",
        '".$_POST['item_code'][$i]."'
        )")
        or die('Error:: ' . mysqli_error($conn));

    }//LOOP ENDED

    header("location:serial_purchase_return_details.php?ret_id=".$new_return_id."&email=1");

  }

?>
<?php include "../../header.php" ?>

<span class="supplier_id hidden"><?php echo $_GET['sup_id']; ?></span>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Purchase Return# <?php echo $new_return_id; ?>
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- col -->
      <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">

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
                      <input type="text" name="purchase_date" 
                      class="form-control purchase_date" id="purchase_date" 
                      value="<?php echo $date;?>">
                    </label>
                    <label for="" class="col col-md-4 col-sm-6">
                      Supplier
                      <div style="font-weight:normal;">
                    <?php 
                      $fetch_suppliers = mysqli_query($conn,"select name from 
                      tbl_suppliers where supplier_id='".$_GET['sup_id']."'");
                      $supplier = mysqli_fetch_assoc($fetch_suppliers);
                      echo $supplier['name']; 
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
              <table class="table" id="purchase_items">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Brand</th>
                      <th>Details</th>
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
        <input type="submit" name="submit_purchase" class="submit-form btn btn-success btn-lg pull-right" 
        value="Confirm Purchase" id="submit_purchase">
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
    <source src="../../error-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /error beep -->



<?php include $global_url."footer.php";?>
<script src="serial_purchase_return_script.js"></script>
</body>
</html>

