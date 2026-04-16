
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  $new_pur_id = $_GET['pur_id']; 
  // fetch purchase details
  $fetch_purchase_query = mysqli_query($conn,"select * from tbl_serial_purchases where 
  purchase_id=".$new_pur_id);
  $fetch_purchase = mysqli_fetch_assoc($fetch_purchase_query);

  // fetch suppliers
  $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name");

?>
<?php include "../../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper no-print">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Edit Purchase #<?php echo $new_pur_id;?>
      </h1>
      <input type="text" class="user_id hide" 
        value="<?php echo $_SESSION['user_id'];?>">
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

                    <input type="text" name="purchase_id" class="form-control purchase_id hide" 
                      value="<?php echo $new_pur_id;?>">

                    <label for="" class="col col-md-4 col-sm-6">
                      Date
                      <input type="text" name="purchase_date" class="form-control purchase_date" 
                      value="<?php echo $fetch_purchase['date'];?>" id="purchase_date">
                    </label>

                    <div class="form-group col col-md-4 col-sm-6">
                      <label>Select Supplier</label>
                      <select required class="form-control select2 purchase_supplier" name="purchase_supplier">
                        <option value="">Select Supplier</option>
                          <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
                            <option value="<?php echo $row['supplier_id']; ?>" 
                            <?php echo ($fetch_purchase['supplier_id'] == $row['supplier_id'])?
                            'selected':'' ?>>
                            <?php echo $row['name']; ?></option>
                          <?php endwhile; ?>
                      </select>
                    </div>

                    <!-- QC Required -->
                    <div class="form-group col col-md-4 col-sm-6">
                      <label>QC Required?</label>
                      <select required class="form-control select2 qc_required" name="qc_required">
                        <option value=""></option>
                        <option value="1" 
                        <?php echo $fetch_purchase['qc_required'] == 1? 'selected':''?>>
                        Yes</option>
                        <option value="0" <?php echo $fetch_purchase['qc_required'] == 0? 
                        'selected':''?>>No</option>
                      </select>
                    </div>

                    <label for="" class="col col-md-4 col-sm-6">
                      PO Reference
                      <input type="text" name="po_ref" class="form-control po_ref" 
                      id="po_ref" value="<?php echo $fetch_purchase['po_ref']; ?>">
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
                    <table id="purchase_items" class="table table-bordered">
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
                        <?php
                          $na=1;
                          $fetch_products_query = mysqli_query($conn,"select 
                          distinct pr.item_code,
                          pr.item_grade,
                          pr.item_details,
                          pr.status,
                          pr.item_brand,
                          pu.tray_id,
                          pu.purchase_return

                          from tbl_serial_products as pr
                          inner join tbl_serial_purchases as pu 
                          on pu.item_code = pr.item_code
                          where pu.purchase_id = ".$new_pur_id." 
                          order by pr.id ASC");
                          while($row = mysqli_fetch_assoc($fetch_products_query)):
                        ?>
                        <tr>
                          <td class="row-id hide">
                            <?php echo $na; ?>
                          </td>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control item-code" name="item_code[]" 
                              value="<?php echo $row['item_code'];?>"
                              required>
                              <span class="help-block item-code-help-block"></span>
                              <svg class="code727 code<?php echo $na;?>"></svg>
                            </div>
                          </td>
                          <td>
                            <select class="form-control brand-field" name="item_brand[]" >
                              <?php 
                              // fetch brands/categories
                              $fetch_categories = mysqli_query($conn,"select * from tbl_categories");
                              while($item = mysqli_fetch_assoc($fetch_categories)):?>
                                <option value="<?php echo $item['category_id'];?>" 
                                <?php echo ($item['category_id'] == $row['item_brand'])?'selected':''; ?>
                                ><?php echo $item['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                              <?php echo $item; ?>
                          </td>
                          <td>
                            <select class="form-control grade-field" name="item_grade[]" >
                            <option value="">select</option>
                              <?php 
                              // fetch grades
                              $fetch_grades_query = mysqli_query($conn,"select * from tbl_grades");
                              while($get_grade = mysqli_fetch_assoc($fetch_grades_query)):?>
                                <option value="<?php echo $get_grade['grade_id'];?>" 
                                <?php echo ($get_grade['grade_id'] == $row['item_grade'])?'selected':''; ?>
                                ><?php echo $get_grade['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <input type="text" class="form-control details-field" 
                            value="<?php echo $row['item_details'];?>"
                            name="item_details[]" >
                          </td>
                          <td>
                            <select class="form-control tray-field" name="item_tray[]" >
                              <option value="">select</option>
                              <?php 
                              // fetch trays
                              $fetch_trays_query = mysqli_query($conn,"select * from tbl_trays");
                              while($get_tray = mysqli_fetch_assoc($fetch_trays_query)):?>
                                <option value="<?php echo $get_tray['tray_id'];?>" 
                                <?php echo ($get_tray['tray_id'] == $row['tray_id'])?'selected':''; ?>
                                ><?php echo $get_tray['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <?php if($row['purchase_return'] != 1): ?>
                              <?php 
                                echo $na === 1 ? '':
                                '<button class="del_row btn btn-danger"><i class="fa fa-close"></i></button>';                          
                              ?>

                            <?php else:?>
                              <p class="text-danger">Returned</p>
                            <?php endif;?>

                            <!-- re-update purchase return tbl_purchases-->
                            <input type="number" name="purchase_return[]" 
                            class="hidden purchase_return" value="<?php echo $row['purchase_return']; ?>">
                            <!-- re-update status in item_imei -->
                            <input type="number" name="status[]" 
                            class="hidden status" value="<?php echo $row['status']; ?>">

                            <label class="btn btn-success print_tag">
                              <i class="fa fa-print"></i>
                            </label>

                          </td>
                        </tr>
                        <?php $na++; ?>
                        <?php endwhile;?>
                      </tbody>
                      <tfoot>
                        <tr class="add_new_row">
                          <td colspan="8">
                            <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> New Item</button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    <hr>
                    <p class="pull-left">
                          <b>Total items: </b> <span class="total_items"><?php echo $na-1; ?></span>
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

  <div class="tag-container">
  </div>

  
  <!-- loading screen on validtion -->
  <div class="page-loader hide">
    <i class="fa fa-spinner fa-spin"></i>
  </div>


  <!-- Don't consider items already added while searching for duplication -->
  <ul class="fetch-old-items hide">
    <?php 
      $fetch_olditems = mysqli_query($conn, "select item_code from 
      tbl_serial_purchases 
        where purchase_id=".$new_pur_id)
      or die('Error:: ' . mysqli_error($conn));
      while($oldItem = mysqli_fetch_assoc($fetch_olditems)):
    ?>
    <li><?php echo $oldItem['item_code']; ?></li>
    <?php endwhile;?>
  </ul>


  <?php include $global_url."footer.php";?>
  <script src="edit_serial_purchase_script.js"></script>
</body>
</html>