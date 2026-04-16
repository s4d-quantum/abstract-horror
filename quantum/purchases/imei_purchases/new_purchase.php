<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  $curr_date = date("Y-m-d");

  // fetch brands/categories
  $fetch_categories = mysqli_query($conn,"select * from tbl_categories");

  // fetch suppliers
  $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name");

?>
<?php include "../../header.php";?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper no-print">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      New Purchase
      <input type="text" class="user_id hide" value="<?php echo $_SESSION['user_id'];?>">
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
                        <input type="text" name="purchase_date" class="form-control purchase_date"
                          value="<?php echo $curr_date; ?>" id="purchase_date">
                      </label>

                      <div class="form-group col col-md-4 col-sm-6">
                        <label>Select Supplier</label>
                        <select required class="form-control select2 purchase_supplier" name="purchase_supplier">
                          <option value="">Select Supplier</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
                          <option value="<?php echo $row['supplier_id']; ?>">
                            <?php echo $row['name']; ?> </option>
                          <?php endwhile; ?>
                        </select>
                      </div>

                      <!-- QC Required -->
                      <div class="form-group col col-md-4 col-sm-6">
                        <label>QC/Repair Required?</label>
                        <select required class="form-control select2 qc_required" name="qc_required">
                          <option value="0">None</option>
                          <option value="1">Repair</option>
                          <option value="2">QC</option>
                        </select>
                      </div>

                      <label for="" class="col col-md-4 col-sm-6">
                        PO Reference
                        <input type="text" name="po_ref" class="form-control po_ref" id="po_ref">
                      </label>

                    </div>
                    <!-- row ended -->
                  </div>
                  <!-- /.box-body -->
                </div>

                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Items</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">

                    <!-- group items -->
                    <!-- <label for="group-items" class="form-control">
                    <input type="checkbox" id="group-items" name="same_items_check" 
                    class="">
                    All items have same details
                  </label> -->
                    <!-- /group items -->
                    <?php $row_id = 1;?>
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
                          <th>Tray#</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="row-id">
                            <?php echo $row_id;?>
                          </td>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control imei-field" name="imei_field[]" tabindex=""
                                required>
                              <span class="help-block imei-help-block"></span>
                              <svg class="code727 code1"></svg>
                            </div>
                          </td>
                          <td>
                            <input type="text" class="form-control details-field" name="details_field[]">
                          </td>
                          <td>
                            <input type="text" class="form-control color-field" name="color_field[]">
                          </td>
                          <td>
                            <select class="form-control grade-field" name="grade_field[]">
                              <?php 
                                $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
                                while($item = mysqli_fetch_assoc($fetch_grades)):?>
                              <option value="<?php echo $item['grade_id'];?>"><?php echo $item['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <select class="form-control brand-field" name="brand_field[]">
                              <!-- <option value="">select</option> -->
                              <?php while($item = mysqli_fetch_assoc($fetch_categories)):?>
                              <option value="<?php echo $item['category_id'];?>"><?php echo $item['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <select class="form-control gb-field" name="gb_field[]">
                              <!-- <option value="">select</option> -->
                              <option value="4">4 GB</option>
                              <option value="8">8 GB</option>
                              <option value="16">16 GB</option>
                              <option value="24">24 GB</option>
                              <option value="32">32 GB</option>
                              <option value="64">64 GB</option>
                              <option value="128">128 GB</option>
                              <option value="256">256 GB</option>
                              <option value="512">512 GB</option>
                              <option value="1024">1 TB</option>
                              <option value="2048">2 TB</option>
                            </select>
                          </td>
                          <td>
                            <select class='form-control tray-field' name='tray_field[]'>
                              <?php 
                              $fetch_trays = mysqli_query($conn,"select * from tbl_trays");
                              while($item = mysqli_fetch_assoc($fetch_trays)):?>
                              <option value="<?php echo $item['tray_id'];?>"><?php echo $item['title']; ?></option>
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
                        <!-- <tr class="add-new-row hide">
                          <td colspan="8">
                            <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> New Item</button>
                          </td>
                        </tr> -->
                      </tfoot>
                    </table>
                    <hr>
                    <p class="pull-left">
                      <b>Total items: </b> <span class="total_items">1</span>
                    </p>
                    <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
                    <input type="submit" name="submit_btn" class="pull-right btn btn-lg btn-success submit-form">
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

<div class="tag-container">
</div>

<!-- loading screen on validtion -->
<div class="page-loader">
  <i class="fa fa-spinner fa-spin"></i>
</div>



<?php include $global_url."footer.php";?>
<script src="new_purchase_script.js"></script>

</body>

</html>
