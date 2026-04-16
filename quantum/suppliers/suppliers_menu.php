<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Suppliers
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
                <div class="box">
                  <!-- /.box-header -->
                  <div class="box-body">
                    <div class="row">
                      <div class="col col-md-4 col-xs-12 col-sm-6">
                        <a href="manage_suppliers.php">
                          <button type="button" class="btn btn-block btn-lg btn-success">Suppliers</button>
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