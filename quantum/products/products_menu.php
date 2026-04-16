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
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Inventory</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="imei/manage_products.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">IMEI Products</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="serial/manage_serial_products.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Serial Products</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="accessories/manage_accessories.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Accessories</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                      <br/>
                        <a href="locations/manage_locations.php">
                          <button type="button" class="btn btn-block btn-lg btn-info">By Location</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                      <br/>
                        <a href="parts/manage_parts.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Parts</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                      <br/>
                        <a href="admin_ops/index.php">
                          <button type="button" class="btn btn-block btn-lg btn-warning">Admin Ops</button>
                        </a>
                      </div>
                    </div>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->


                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Categories</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="categories/manage_categories.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Manage Categories</button>
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
