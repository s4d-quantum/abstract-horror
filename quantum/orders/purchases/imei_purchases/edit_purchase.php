<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  $new_pur_id = $_GET['pur_id'];

  // fetch purchase details
  $fetch_purchase_query = mysqli_query($conn,"select * from tbl_purchases where 
  purchase_id='".$new_pur_id."'")
    or die('Error:: ' . mysqli_error($conn));
  $fetch_purchase = mysqli_fetch_assoc($fetch_purchase_query);

  // fetch suppliers
  $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name")
    or die('Error:: ' . mysqli_error($conn));


?>

<?php include "../../header.php";?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper no-print">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Edit Purchase #IP-<?php echo $new_pur_id;?>
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
                        <option value="<?php echo $row['supplier_id']; ?>" <?php echo ($fetch_purchase['supplier_id'] == $row['supplier_id'])?
                            'selected':''; ?>>
                          <?php echo $row['name']; ?></option>
                        <?php endwhile; ?>
                      </select>
                    </div>

                    <!-- QC Required -->
                    <div class="form-group col col-md-4 col-sm-6">
                      <label>QC/Repair Required?</label>
                      <select required class="form-control select2 qc_required" name="qc_required">
                        <option value="0">None</option>
                        <option value="1" <?php echo $fetch_purchase['repair_required'] == 1? 
                          'selected':''?>>Repair</option>
                        <option value="2"
                          <?php echo $fetch_purchase['repair_required'] == 0 && $fetch_purchase['qc_required'] == 1? 'selected':''?>>
                          QC</option>
                      </select>
                    </div>

                    <label for="" class="col col-md-4 col-sm-6">
                      PO Reference
                      <input type="text" name="po_ref" class="form-control po_ref" id="po_ref"
                        value="<?php echo $fetch_purchase['po_ref']; ?>">
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
                        <?php
                          $na=1;
                          $fetch_products_query = mysqli_query($conn,"select 
                          distinct 
                          pr.purchase_id,
                          pr.purchase_return,
                          pr.tray_id,
                          im.item_imei,
                          im.item_tac,
                          im.item_color,
                          im.item_grade,
                          im.item_gb,
                          im.status,
                          tc.item_details,
                          tc.item_brand
                          from tbl_imei as im 
                          
                          inner join tbl_tac as tc 
                          on im.item_tac = tc.item_tac 
                          
                          inner join tbl_purchases as pr 
                          on pr.item_imei = im.item_imei 

                          where pr.purchase_id = '".$fetch_purchase['purchase_id']."' 
                          order by pr.id ASC")
                          or die('Error:: ' . mysqli_error($conn));

                          while($row = mysqli_fetch_assoc($fetch_products_query)):
                        
                        ?>
                        <tr>
                          <td class="row-id"><?php echo $na;?></td>
                          <td>
                            <div class="form-group">
                              <input type="text" class="form-control imei-field" name="imei_field[]"
                                value="<?php echo $row['item_imei'];?>" required>
                              <span class="help-block imei-help-block"></span>
                              <svg class="code727 code<?php echo $na;?>"></svg>
                            </div>
                          </td>
                          <td>
                            <input type="text" class="form-control details-field"
                              <?php echo $_SESSION['user_role'] !== 'admin' ? 'disabled' : ''; ?>
                              value="<?php echo $row['item_details'];?>" name="details_field[]">
                          </td>
                          <td>
                            <input type="text" class="form-control color-field" value="<?php echo $row['item_color'];?>"
                              name="color_field[]">
                          </td>
                          <td>
                            <select class="form-control grade-field" name="grade_field[]">
                              <?php 
                              // fetch grades
                              $fetch_grades = mysqli_query($conn,"select * from tbl_grades");
                              while($get_grade = mysqli_fetch_assoc($fetch_grades)):?>
                              <?php echo $get_grade['title']; ?>
                              <option value="<?php echo $get_grade['grade_id'];?>"
                                <?php echo ($get_grade['grade_id'] == $row['item_grade'])?'selected':''; ?>>
                                <?php echo $get_grade['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                          </td>
                          <td>
                            <select class="form-control brand-field" name="brand_field[]">
                              <?php 
                              // fetch brands/categories
                              $fetch_categories = mysqli_query($conn,"select * from tbl_categories");
                              while($item = mysqli_fetch_assoc($fetch_categories)):?>
                              <option value="<?php echo $item['category_id'];?>"
                                <?php echo ($item['category_id'] == $row['item_brand'])?'selected':''; ?>>
                                <?php echo $item['title']; ?></option>
                              <?php endwhile;?>
                            </select>
                            <?php echo $item; ?>
                          </td>
                          <td>
                            <select class="form-control gb-field" name="gb_field[]">
                              <option value="">select</option>
                              <?php 
                                  $gb_value = array(4,8,16,24,32,64,128,256,512,1024,2048);
                                  for($t=0; $t<count($gb_value); $t++){ 
                                    $label = ($gb_value[$t] >= 1024) ? ($gb_value[$t]/1024).' TB' : $gb_value[$t].' GB';
                                  ?>
                              <option value="<?php echo $gb_value[$t];?>"
                                <?php echo ($gb_value[$t] == $row['item_gb'])?'selected':'';?>>
                                <?php echo $label; ?>
                              </option>
                              <?php 
                                  }
                                ?>
                            </select>
                          </td>
                          <td>
                            <select class='form-control tray-field' name='tray_field[]'>
                              <?php 
                                $fetch_trays = mysqli_query($conn,"select * from tbl_trays");
                                while($item = mysqli_fetch_assoc($fetch_trays)):?>
                              <option value="<?php echo $item['tray_id'];?>"
                                <?php echo ($item['tray_id'] == $row['tray_id'])?'selected':'';?>>
                                <?php echo $item['title']; ?></option>
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
                            <input type="number" name="purchase_return[]" class="hidden purchase_return"
                              value="<?php echo $row['purchase_return']; ?>">
                            <!-- re-update status in item_imei -->
                            <input type="number" name="status[]" class="hidden status"
                              value="<?php echo $row['status']; ?>">

                          </td>
                        </tr>
                        <?php $na++; ?>
                        <?php endwhile;?>
                      </tbody>
                      <tfoot>
                        <tr class="add-new-row">
                          <td colspan="9">
                            <button class="pull-right btn btn-warning add_row btn-block"><i class="fa fa-plus"></i> New
                              Item</button>
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

<!-- Grades for new row copy-->
<select class="form-control grade-field-copy hide">
  <option value="">select</option>
  <?php 
    // fetch grades
    $fetch_grades_query2= mysqli_query($conn,"select * from tbl_grades");
    while($get_grade2 = mysqli_fetch_assoc($fetch_grades_query2)): 
    
    ?>
  <option value="<?php echo $get_grade2['grade_id'];?>"><?php echo $get_grade2['title']; ?></option>
  <?php endwhile;?>
</select>


<!-- error beep -->
<audio id="myAudio">
  <source src="../../error-beep.mp3" type="audio/mp3">
  Your browser does not support the audio element.
</audio>
<!-- /error beep -->

<select class="hide tray_collection">
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

<!-- Don't consider items already added while searching for duplication -->
<ul class="fetch-old-items hide">
  <?php 
      $fetch_olditems = mysqli_query($conn, "select item_imei from tbl_purchases 
        where purchase_id=".$new_pur_id)
      or die('Error:: ' . mysqli_error($conn));
      while($oldItem = mysqli_fetch_assoc($fetch_olditems)):
    ?>
  <li><?php echo $oldItem['item_imei']; ?></li>
  <?php endwhile;?>
</ul>

<?php include $global_url."footer.php";?>
<script src="edit_purchase_script.js"></script>
</body>

</html>
