<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Settings
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
                  <h3 class="box-title">Settings</h3>
                </div>
                <!-- /.box-header -->
                <div class="box-body">
                  <div class="row">
                    <div class="col col-md-4 col-xs-3 col-sm-4">
                      <a href="manage_logs.php">
                        <button type="button" class="btn btn-block btn-lg btn-success">Activities Log</button>
                      </a>
                    </div>
                    <div class="col col-md-4 col-xs-4 col-sm-4">
                      <a href="company_info.php">
                        <button type="button" class="btn btn-block btn-lg btn-success">Company Info</button>
                      </a>
                    </div>
                    <div class="col col-md-4 col-xs-4 col-sm-4">
                      <a href="manage_trays/manage_trays.php">
                        <button type="button" class="btn btn-block btn-lg btn-success">Manage Tray</button>
                      </a>
                    </div>
                  </div>
                  <br>
                  <div class="row">
                    <div class="col col-md-4 col-xs-4 col-sm-4">
                      <a href="manage_grades.php">
                        <button type="button" class="btn btn-block btn-lg btn-success">Manage Grades</button>
                      </a>
                    </div>
                    <div class="col col-md-4 col-xs-4 col-sm-4">
                      <a href="manage_flash/manage_flash.php">
                        <button type="button" class="btn btn-block btn-lg btn-success">Manage QC Descriptions</button>
                      </a>
                    </div>
                    <div class="col col-md-4 col-xs-4 col-sm-4">
                      <?php if($_SESSION['user_role'] == 'admin'):?>
                      <a href="../onboarding/index.php">
                        <button type="button" class="btn btn-block btn-lg btn-success">New Vendor Onboarding</button>
                      </a>
                      <?php endif; ?>
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