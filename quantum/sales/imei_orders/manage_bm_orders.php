<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
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
                  <a href="new_bm_order.php" class="btn btn-success pull-right">
                    <i class="fa fa-plus"></i> New BM Order
                  </a>
                  <?php 
                      endif;
                    ?>

                  <!-- user session  -->
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
                      </div>
                      <table class="table table-bordered">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>BM Order ID</th>
                            <th>Customer</th>
                            <th>SKU</th>
                            <th>IMEI</th>
                            <th>State</th>
                            <th>Shipper</th>
                            <th>Tracking</th>
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

<?php include $global_url."footer.php";?>
<script src="../../assets/js/xlsx.full.min.js"></script>
<script src="manage_bm_order_script.js"></script>

</body>

</html>