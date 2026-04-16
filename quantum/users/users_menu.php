<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      users
    </h1>

      <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Setup</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6 col-lg-3 ">
                        <a href="new_user.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">New user</button>
                        </a>
                      </div>
                      <div class="col col-md-4 col-xs-12 col-sm-6 col-lg-3 ">
                        <a href="manage_users.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Manage users</button>
                        </a>
                      </div>
                    </div>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->

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
