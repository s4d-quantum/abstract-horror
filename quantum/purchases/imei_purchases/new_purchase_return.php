<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // NEW order ID
  $new_return_id_query = mysqli_query($conn,"Select max(return_id) from 
  tbl_purchase_return")
    or die('Error:: ' . mysqli_error($conn));
  $order_id_result = mysqli_fetch_assoc($new_return_id_query);
  $new_return_id = $order_id_result['max(return_id)'] + 1;

  $curr_date = date("Y-m-d");

  if(isset($_POST['submit_btn'])){
    
    $user_id = $_SESSION['user_id'];
    $date = str_replace("/", "-", $_POST['purchase_date']);

    // INSERT TO PURCHASE INVENTORY TBL
    for($i = 0; $i<count($_POST['imei_field']); $i++){

      // Fetch purchase_id for each item
      $fetch_purchase_query = mysqli_query($conn,"select purchase_id from tbl_purchases 
        where 
        item_imei='".$_POST['imei_field'][$i]."' and 
        purchase_return = 0 
        order by id desc")
        or die('Error:: '.mysqli_error($conn));
      $purchase_id = mysqli_fetch_assoc($fetch_purchase_query)['purchase_id'];

      // ADD INTO PURCHASE RETURN 
      $new_purchase_return = mysqli_query($conn,"insert into tbl_purchase_return 
      (
        item_imei,
        date,
        return_id, 
        user_id, 
        purchase_id,
        tracking_no,
        delivery_company
        ) 
        values(
        '".$_POST['imei_field'][$i]."',
        '".$date."',
        '".$new_return_id."',
        ".$user_id.", 
        '".$purchase_id."',
        '".$_POST['tracking_no']."',
        '".$_POST['delivery_company']."'
        )")
        or die('Error:: '.mysqli_error($conn));


      // UPDATE ITEM IMEI
      $new_imei = mysqli_query($conn,"update tbl_imei 
        set 
        status = 0
        where item_imei ='".$_POST['imei_field'][$i]."'") 
        or die('Error:: ' . mysqli_error($conn));

      // UPDATE TBL PURCHASES
      $update_purchases = mysqli_query($conn,"update tbl_purchases 
        set 
        purchase_return = 1
        where 
        item_imei ='".$_POST['imei_field'][$i]."' and 
        purchase_id='".$purchase_id."'") 
        or die('Error:: ' . mysqli_error($conn));


      // INPUT LOG
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
      '".'IPR-'.$new_return_id."',
      'NEW IMEI PURCHASE RETURN',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$_POST['imei_field'][$i]."'
      )")
      or die('Error:: ' . mysqli_error($conn));

    }//for loop ended

    header("location:purchase_return_details.php?ret_id=".$new_return_id."&email=1");

  }
?>
<?php include "../../header.php";?>

<span class="supplier_id hidden"><?php echo $_GET['sup_id']; ?></span>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      New Purchase Return# IPR-<?php echo $new_return_id;?>
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

              <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <label for="" class="col col-md-4 col-sm-6">
                        Date
                        <input type="text" name="purchase_date" class="form-control purchase_date" id="purchase_date"
                          value="<?php echo $curr_date;?>">
                      </label>
                      <label for="" class="col col-md-4 col-sm-6">
                        Tracking No#
                        <input type="text" name="tracking_no" class="form-control tracking_no" id="tracking_no"
                          value="">
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
                    <div class="row">
                      <!-- Delivery Company -->
                      <div class="deliver-company col-md-3 col-sm-4">
                        <label for="">Delivery Company</label>
                        <input type="text" name="delivery_company" class="form-control">
                      </div>

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
                            <th>S.No</th>
                            <th>IMEI</th>
                            <th>Model/Details</th>
                            <th>Color</th>
                            <th>Grade</th>
                            <th>Brand</th>
                            <th>GBs</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>1</td>
                            <td>
                              <div class="form-group">
                                <input type="text" class="form-control imei-field" name="imei_field[]" required
                                  id="imei-field">
                                <span class="help-block"></span>
                              </div>
                            </td>
                            <td>
                              <input type="text" class="form-control details-field" name="details_field[]">
                              <input type="text" class="hide form-control purchase_id" name="purchase_id[]">
                            </td>
                            <td>
                              <input type="text" class="form-control color-field" name="color_field[]">
                            </td>
                            <td>
                              <input type="text" class="form-control grade-field" name="grade_field[]">
                            </td>
                            <td>
                              <input type="text" class="form-control brand-field" name="brand_field[]">
                            </td>
                            <td>
                              <input type="text" class="form-control gb-field" name="gb_field[]">
                            </td>
                            <td></td>
                          </tr>
                          <tr class="add-new-row">
                            <td colspan="8">
                              <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i>
                                New
                                Item</button>
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

<!-- error beep -->
<audio id="myAudio">
  <source src="../../error-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>
<!-- /error beep -->

<select class="form-control grade-field">
  <?php 
      $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
      while($item = mysqli_fetch_assoc($fetch_grades)):?>
  <option value="<?php echo $item['grade_id'];?>"><?php echo $item['title']; ?></option>
  <?php endwhile;?>
</select>


<?php include $global_url."footer.php";?>
<script src="new_purchase_return_script.js"></script>
</body>

</html>