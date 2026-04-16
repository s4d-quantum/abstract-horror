<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Goods In
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
                
                <!-- box started -->
                <div class="box box-success">
                  <div class="box-header">
                    <h3 class="box-title">IMEI Purchases</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="imei_purchases/purchase_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">IMEI Purchases</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="imei_purchases/purchase_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Manage Purchase Return</button>
                        </a>
                      </div>
                    </div>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->

 
                <!-- box started -->
                <div class="box box-primary">
                  <div class="box-header">
                    <h3 class="box-title">Serial Purchases</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="serial_purchases/serial_purchase_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-primary">Serial Purchases</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="serial_purchases/serial_purchase_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-primary">Manage Purchase Return</button>
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
                    <h3 class="box-title">Accessories Purchases</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="accessories/accessories_purchase_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Accesories Purchase</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="accessories/accessories_purchase_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Manage Purchase Return</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="accessories/manage_accessories_brands.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Manage Brands</button>
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
                    <h3 class="box-title">Parts Purchases</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="parts/parts_purchase_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Parts Purchase</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="parts/parts_purchase_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Manage Purchase Return</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="parts/manage_parts_brands.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Manage Brands</button>
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

</body>
</html>