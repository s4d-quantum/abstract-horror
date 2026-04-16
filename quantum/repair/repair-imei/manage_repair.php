<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage Repairs
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

              <!-- datatable begins-->
                <div class="custom_datatable">
                  <div class="table-wrapper">
                    <div class="table-filter">
                        <div class="row">
                          <div class="col-sm-12">
                              <div class="filter-group">
                                <input type="text" class="form-control search-datatable" placeholder="Search ID">
                              </div>
                          </div>
                        </div>
                    </div>
                    <table class="table table-striped table-hover">
                      <thead>
                        <tr>
                        <th>P.Date</th>
                          <th>Purchase ID</th>
                          <th>Supplier</th>
                          <th>Status</th>
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
                        <div class="prev-next-btn" data-value="previous"><a href="#" class="page-link">Previous</a></div>
                        <div class="current-page-btn"><b>Page: <span class="current-page">1</span> of <span class="total-pages"></span></b></div>
                        <div class="prev-next-btn" data-value="next"><a href="#" class="page-link">Next</a></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="brand-list hide">
                  <?php $get_category = mysqli_query($conn,"select title, category_id from tbl_categories")
                  or die('Error: '.mysqli_error($conn)); 
                  while($brands = mysqli_fetch_assoc($get_category)){
                    echo '<span>'.$brands['title']."-".$brands['category_id']."</span>";
                  }
                  ?>
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
<script src="manage_repair_history_datatable_script.js"></script>



</body>
</html>