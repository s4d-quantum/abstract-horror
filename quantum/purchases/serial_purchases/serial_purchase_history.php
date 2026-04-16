<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

// fetch suppliers
  $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name");

  // // ************
// // DELETE PURCHASE
// // ************
  if(isset($_GET['del'])){

    $purchase_id = $_GET['del'];
    $date = date("Y-m-d");
    $user_id = $_SESSION['user_id'];

    // delete purchase return record
    $fetch_order_items = mysqli_query($conn,"delete from 
    tbl_serial_purchase_return where 
    purchase_id = '".$purchase_id."'")
    or die('Error:: ' . mysqli_error($conn));

    // delete purchase record
    $delete_purchase= mysqli_query($conn,"delete from tbl_serial_purchases where 
    purchase_id ='".$purchase_id."'");

    // delete purchase qc record
    $fetch_order_items = mysqli_query($conn,"delete from 
    tbl_qc_serial_products where 
    purchase_id = '".$purchase_id."'")
    or die('Error:: ' . mysqli_error($conn));

    // delete IMEI
    $new_serial = mysqli_query($conn,"delete from tbl_serial_products where 
    purchase_id ='".$purchase_id."'") 
    or die('Error:: ' . mysqli_error($conn));

    // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (ref,details,
    date, user_id)
    values
    ('SP-'".$purchase_id."','SERIAL PURCHASE DELETED','".$date."',
    ".$user_id.")")
    or die('Error:: ' . mysqli_error($conn));


    // INPUT LOG STARTED
    $fetch_purchase_items = mysqli_query($conn,"select * from 
    tbl_serial_purchases where 
    purchase_id = '".$purchase_id."'")
    or die('Error:: ' . mysqli_error($conn));
    $item_array= array();

    while($t = mysqli_fetch_assoc($fetch_purchase_items)){
      $new_log = mysqli_query($conn,"insert into tbl_log (
      ref,
      subject,
      details,
      date, 
      user_id,
      item_code
      )
      values
      (
      '".'SP-'.$purchase_id."',
      'SERIAL PURCHASE DELETED',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$t['item_imei']."'
      )")
      or die('Error:: ' . mysqli_error($conn));
    }//while loop ended
    // INPUT LOG ENDED


    header("location:serial_purchase_history.php");
    
  }
?>

<?php include "../../header.php";
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
                    <h3 class="box-title">Serial Purchases</h3>
                    <a href="new_serial_purchase.php" class="btn btn-success pull-right">
                    <i class="fa fa-plus"></i> New Purchase</a>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    
              <!-- fetching user role for priority work -->
              <input type="text" class="hide user_id" value="<?php echo $_SESSION['user_id']; ?>">
              <input type="text" class="hide user_role" value="<?php echo $_SESSION['user_role']; ?>">
                  
                <!-- datatable begins-->
                <div class="custom_datatable">
                  <div class="table-wrapper">
                    <div class="table-filter">
                      <div class="row">
                        <div class="col-sm-3">
                            <input type="text" class="form-control search-datatable"
                            placeholder="Search ID">
                        </div>
                        <div class="col-sm-3">
                          <select required class="form-control select2 search_supplier">
                            <option value="">Select Supplier</option>
                            <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
                            <option value="<?php echo $row['supplier_id']; ?>">
                            <?php echo $row['name']; ?> </option>
                          <?php endwhile; ?>
                          </select>
                        </div>

                        <div class="col-sm-3">
                          <input type="text" placeholder="From:" name="from_date" class="form-control from_date" 
                          id="from_date" required>
                        </div>

                        <div class="col-sm-3">
                          <input type="text" placeholder="To:" name="to_date" class="form-control to_date" 
                          id="to_date" required>
                        </div>


                      </div>
                    </div>
                    <table class="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>P.ID</th>
                          <th>Date</th>
                          <th>Supplier</th>
                          <th>QC Required?</th>
                          <th>Actions</th>
                          <th>Priority</th>
                          <th>Qty</th>
                        </tr>
                      </thead>
                        <tbody>
                        </tbody>
                    </table>
                    <div class="data-loading">
                    <div class="sk-folding-cube">
  <div class="sk-cube1 sk-cube"></div>
  <div class="sk-cube2 sk-cube"></div>
  <div class="sk-cube4 sk-cube"></div>
  <div class="sk-cube3 sk-cube"></div>
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
<script src="purchase-history-datatable-script.js"></script>

</body>
</html>