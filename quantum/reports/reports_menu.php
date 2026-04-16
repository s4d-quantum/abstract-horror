<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

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
                
                <!-- box started -->
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">IMEI Orders</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="purchase_report.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Purchase Report</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="order_report.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Order Report</button>
                        </a>
                      </div>
                    </div>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->


                <!-- box started -->
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Non IMEI Orders</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="non_imei_purchase_report.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Purchase Report</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="non_imei_order_report.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Order Report</button>
                        </a>
                      </div>
                    </div>
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
