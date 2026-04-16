<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Goods Out
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
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">IMEI Orders</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="imei/order_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">IMEI Orders</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="imei/order_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Manage  Order Return</button>
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
                    <h3 class="box-title">Serial orders</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="serial/serial_order_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-primary">Serial Orders</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="serial/serial_order_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-primary">Manage Order Return</button>
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
                    <h3 class="box-title">Accessories orders</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="accessories/accessories_order_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Accessories Orders</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="accessories/accessories_order_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Manage  Order Return</button>
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
                    <h3 class="box-title">Parts orders</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="parts/parts_order_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Parts Orders</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="parts/parts_order_return_history.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">Manage Order Return</button>
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