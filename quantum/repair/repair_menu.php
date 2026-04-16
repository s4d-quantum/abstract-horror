<?php $global_url="../"; ?>
<?php include "../authenticate.php"; ?>
<?php include "../header.php"; ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Repair Menu
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
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="repair-imei/manage_repair.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Manage Repair IMEI</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="repair-serial/manage_repair.php" >
                          <button type="button" class="btn btn-block btn-lg btn-success" disabled>Manage Repair Serial</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="level3-repair/manage_repair.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Level 3 Repairs</button>
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
