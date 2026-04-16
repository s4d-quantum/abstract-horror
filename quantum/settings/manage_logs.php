<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php include "../header.php";

mysqli_select_db($conn, 's4d_user_accounts');                    

// fetch suppliers
$fetch_users = mysqli_query($conn,"select * from tbl_accounts where user_db='".$_SESSION['user_db']."'");

mysqli_select_db($conn, $_SESSION['user_db']);                    
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
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
                  <h3 class="box-title">Activity log</h3>
                </div>
                <!-- /.box-header -->
                <div class="box-body">

                  <!-- datatable begins-->
                  <div class="custom_datatable">
                    <div class="table-wrapper">
                      <div class="table-filter">
                        <div class="row">

                          <div class="col-sm-3">
                            <select required class="form-control select2 search_user">
                              <?php while($row = mysqli_fetch_assoc($fetch_users)):?>
                              <option value="<?php echo $row['user_id']; ?>"
                                data-name="<?php echo $row['user_name']; ?>">
                                <?php echo $row['user_name']; ?> </option>
                              <?php endwhile; ?>
                            </select>
                          </div>

                        </div>
                      </div>
                      <table class="table table-striped table-hover">
                        <thead>
                          <tr>
                            <th>Date/Time</th>
                            <th>Ref</th>
                            <th>Subject</th>
                            <th>Details</th>
                            <th>User</th>
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
<script src="../assets/js/moment.min.js"></script>
<script src="activity-log-script.js"></script>

</body>

</html>