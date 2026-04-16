<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // DISPLAYING SUPPLIERS
  $display_suppliers_query = mysqli_query($conn,"select * from tbl_suppliers order by name");

  $curr_date = date("Y-m-d");
 
?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper no-print">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        New Purchase
      </h1>
      <input type="text" class="user_id hide" 
              value="<?php echo $_SESSION['user_id'];?>">
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- col -->
      <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">
      <div class="col-md-12">
        <!-- box started-->
          <div class="box box-warning">
            <div class="box-body">

              <label for="" class="col col-md-4 col-sm-6">
                Date
                <input type="text" name="purchase_date" 
                class="form-control purchase_date" id="purchase_date"
                value="<?php echo $curr_date; ?>">
              </label>

              <div class="col-md-4">
                <div class="form-group">
                  <label>Select Supplier</label>
                  <select required class="form-control purchase_supplier" name="purchase_supplier" style="width: 100%;">
                    <option value="">Select Supplier</option>
                    <?php while($row = mysqli_fetch_assoc($display_suppliers_query)):?>
                    <option value="<?php echo $row['supplier_id']; ?>">
                    <?php echo $row['name']; ?> </option>
                  <?php endwhile; ?>
                  </select>
                </div>
              </div>

              <!-- QC Required -->
              <div class="form-group col col-md-4 col-sm-6">
                <label>QC Required?</label>
                <select required class="form-control qc_required" name="qc_required">
                  <option value=""></option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>

              <label for="" class="col col-md-4 col-sm-6">
                PO Reference
                <input type="text" name="po_ref" class="form-control po_ref" 
                id="po_ref">
              </label>

          </div>
          <!-- /.box-body -->
        </div>
        <!-- /.box -->
      </div>
      <!-- col -->

      <!-- col -->
       <div class="col-md-12">
          <div class="box box-success">
            <div class="box-header">
              <h3 class="box-title">Select Items</h3>
            </div>
            <div class="box-body">
              <?php $row_id = 1;?>
              <table class="table" id="purchase_items">
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Brand</th>
                      <th>Grade</th>
                      <th>Details</th>
                      <th>Tray#</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="row-id hidden">
                        <?php echo $row_id;?>
                      </td>
                      <td>
                        <div class='form-group'>
                          <input type='text' class='item-code form-control' required 
                          placeholder="Item code" name='item_code[]' tabindex="">
                          <span class='help-block imei-help-block'></span>
                          <svg class="code727 code1"></svg>
                        </div>
                      </td>
                      <td>
                        <select name="item_brand[]"  class="brand-field form-control" required>
                          <option value="">select</option>
                          <?php 
                            $fetch_brands = mysqli_query($conn,"select * from tbl_categories");
                            while($row = mysqli_fetch_assoc($fetch_brands)):
                          ?>
                          <option value="<?php echo $row['category_id'];?>"><?php echo $row['title'];?></option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <select name="item_grade[]"  class="grade-field form-control">
                          <?php 
                            $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
                            while($row = mysqli_fetch_assoc($fetch_grades)):
                          ?>
                          <option value="<?php echo $row['grade_id'];?>"><?php echo $row['title'];?></option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <input type="text" name="item_details[]"  placeholder="Item details" 
                        class="details-field form-control">
                      </td>
                      <td>
                        <select name="item_tray[]"  class="tray-field form-control">
                          <?php 
                            $fetch_trays1 = mysqli_query($conn,"select * from tbl_trays");
                            while($row = mysqli_fetch_assoc($fetch_trays1)):
                          ?>
                          <option value="<?php echo $row['tray_id'];?>"><?php echo $row['title'];?></option>
                          <?php endwhile;?>
                        </select>
                      </td>
                      <td>
                        <label class="btn btn-success print_tag">
                          <i class="fa fa-print"></i>
                        </label>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <!-- <tr class="add_new_row">
                      <td colspan="5"> -->
                        <!-- <button type="button" class="btn btn-primary btn-block add_row"> -->
                          <!-- <i class="fa fa-plus"></i> &nbsp;Add Item
                        </button> -->
                      <!-- </td>
                    </tr> -->
                  </tfoot>
                </table>
                <hr>
                <p class="pull-left">
                      <b>Total items: </b> <span class="total_items">1</span>
                </p>
            </div>
          </div>
        </div>
        <!-- /.col -->

      <div class="col-md-12">
        <button class="btn btn-primary btn-lg booking-completed pull-right">
          Booking Completed</button>
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


  <div class="tag-container">
  </div>

  <!-- loading screen on validtion -->
  <div class="page-loader hide">
    <i class="fa fa-spinner fa-spin"></i>
  </div>

  <select class="tray_collection">
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

<script src="new_serial_purchase_script.js"></script>
<script>
 // date picker
  $('#purchase_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

</script>
</body>
</html>