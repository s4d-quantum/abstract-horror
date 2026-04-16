<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php
require_once "includes/dpd_printer_helper.php";
$dpdPrinterOptions = getDpdPrinterOptions();
$selectedDpdPrinter = resolveDpdPrinter();
$deliveryNotePrinterOptions = getBmDeliveryNotePrinterOptions();
$deliveryNotePrinterOptions['lasernew'] = 'WH Laser New';
$selectedDeliveryNotePrinter = resolveBmDeliveryNotePrinter();
?>
<?php include "../../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Main content -->
  <section class="content">
    <div class="row">

      <!-- Main content -->
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <div class="box">

                <div class="box-header">
                  <h3 class="box-title">Manage BackMarket Orders</h3>
                  <?php 
                    if($_SESSION['user_role']==='admin'):
                    ?>
                  <a href="new_order.php" class="btn btn-success pull-right" style="margin-left:10px;">
                    <i class="fa fa-plus"></i> New Sales Order
                  </a>
                  <button type="button" class="btn btn-info pull-right" id="bm-auto-settings-btn">
                    <i class="fa fa-cog"></i> BM Auto Settings
                  </button>
                  <?php 
                      endif;
                    ?>

                  <!-- user session -->
                  <input type="text" id="user_id" class="hide" data-user-id="<?php echo $_SESSION['user_id']; ?>"
                    data-is-admin="<?php echo $_SESSION['user_role']; ?>">

                </div>
                <!-- /.box-header -->
                <div class="box-body">

                  <!-- datatable begins-->
                  <div class="custom_datatable">
                    <div class="table-wrapper">
                      <div class="table-filter">
                        <div class="row">
                          <div class="col-sm-12">
                            <div class="filter-group">
                              <label>Search</label>
                              <input type="text" class="form-control search-datatable">
                            </div>
                          </div>
                        </div>
                      <table class="table table-bordered">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>User</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                        </tbody>
                      </table>
                      <div class="data-loading">
                    <div class="spinner">
                      <div class="bounce1"></div>
                      <div class="bounce2"></div>
                      <div class="bounce3"></div>
                    </div>
                    Processing
                  </div>
                      <div class="clearfix">
                        <div class="pagination-wrapper">
                          <div class="prev-next-btn" data-value="previous"><a href="#" class="page-link">Previous</a>
                          </div>
                          <div class="current-page-btn"><b>Page: <span class="current-page">1</span> of <span
                                class="total-pages"></span></b></div>
                          <div class="prev-next-btn" data-value="next"><a href="#" class="page-link">Next</a></div>
 </div>
 </div>
 </div>
 </div>

<style>
  /* Ensure modal sits above any local overlays */
  .modal { z-index: 1060 !important; }
  .modal-backdrop { z-index: 1050 !important; }
  /* Keep local table loading overlay below modal */
  .custom_datatable .data-loading { z-index: 100 !important; }
  /* Fix pointer events if any overlay conflicts */
  .modal.in { pointer-events: auto; }
  .modal.in .modal-dialog { pointer-events: auto; }
  .modal-backdrop.in { pointer-events: auto; }
 </style>
                  <div class="customer-list hide">
                    <?php 
                      $get_customer = mysqli_query($conn,"select name, customer_id from tbl_customers")
                      or die('Error: '.mysqli_error($conn)); 
                      while($customers = mysqli_fetch_assoc($get_customer)):
                        echo '<span>'.$customers['name']."%".$customers['customer_id']."</span>";
                      endwhile;
                    ?>
                  </div>

                  <div class="user-list hide">
                    <?php 

                      // switch to user db 
                      mysqli_select_db($conn, 's4d_user_accounts');                    

                      $get_user1 = mysqli_query($conn,"select user_name, user_id from tbl_accounts")
                      or die('Error: '.mysqli_error($conn)); 
                      while($users1 = mysqli_fetch_assoc($get_user1)):
                        echo '<span>'.$users1['user_name']."%".$users1['user_id']."</span>";
                      endwhile;

                      // switch to user db 
                      mysqli_select_db($conn, $_SESSION['user_db']);                    
                    ?>
                  </div>
                  <!-- /datatable ended-->


                </div>
                <!-- /.box-body -->
              </div>
              <!-- /.box -->
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

<!-- BM Auto Settings Modal -->
<div class="modal fade" id="bm-auto-settings-modal" tabindex="-1" role="dialog" aria-labelledby="bmAutoSettingsLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="bmAutoSettingsLabel">BM Auto Settings</h4>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="bm-collection-cutoff">Collection Cut Off</label>
          <select id="bm-collection-cutoff" class="form-control">
            <option value="12:00">12:00</option>
            <option value="12:30">12:30</option>
            <option value="13:00">13:00</option>
            <option value="13:30">13:30</option>
            <option value="14:00">14:00</option>
            <option value="14:30">14:30</option>
            <option value="15:00">15:00</option>
            <option value="15:30">15:30</option>
            <option value="16:00">16:00</option>
          </select>
          <p class="help-block">Orders created before this time collect today; otherwise tomorrow. Collection time remains 15:30.</p>
        </div>
        <div class="form-group">
          <label for="bm-dpd-printer">DPD Printer</label>
          <select id="bm-dpd-printer" class="form-control">
            <?php foreach ($dpdPrinterOptions as $value => $label): ?>
              <option value="<?php echo htmlspecialchars($value); ?>" <?php echo $value === $selectedDpdPrinter ? 'selected' : ''; ?>>
                <?php echo htmlspecialchars($label); ?>
              </option>
            <?php endforeach; ?>
          </select>
          <p class="help-block">Saved per user/session so each workstation can target its own DPD label printer.</p>
        </div>
        <div class="form-group">
          <label for="bm-delivery-note-printer">Delivery Note Printer</label>
          <select id="bm-delivery-note-printer" class="form-control">
            <?php foreach ($deliveryNotePrinterOptions as $value => $label): ?>
              <option value="<?php echo htmlspecialchars($value); ?>" <?php echo $value === $selectedDeliveryNotePrinter ? 'selected' : ''; ?>>
                <?php echo htmlspecialchars($label); ?>
              </option>
            <?php endforeach; ?>
          </select>
          <p class="help-block">Controls which laser printer receives the BackMarket delivery note PDF.</p>
        </div>
        <div class="alert alert-danger hide" id="bm-settings-error"></div>
        <div class="alert alert-success hide" id="bm-settings-success">Settings saved.</div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" id="save-bm-settings">Save changes</button>
      </div>
    </div>
  </div>
 </div>

<?php   
  // fetch brands/categories
  $fetch_categories = mysqli_query($conn,"select * from tbl_categories");
  ?>
<select required class="fetch_categories hide">
  <?php while($item = mysqli_fetch_assoc($fetch_categories)):?>
  <option value="<?php echo $item['category_id'];?>">
    <?php echo $item['title']; ?></option>
  <?php endwhile; ?>
</select>

<?php   
  // fetch grades
  $fetch_grades = mysqli_query($conn,"select grade_id, title from tbl_grades");
  ?>
<select required class="fetch_grades hide">
  <?php while($item = mysqli_fetch_assoc($fetch_grades)):?>
  <option value="<?php echo $item['grade_id'];?>">
    <?php echo $item['title']; ?></option>
 <?php endwhile; ?>
</select>


<?php include $global_url."footer.php";?>
<script src="../../assets/js/xlsx.full.min.js"></script>
<script src="../../assets/js/moment.min.js"></script>
<script src="manage_backmarket_order_script.js"></script>

</body>

</html>
