<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // ************
  // DELETE PURCHASE RETURN
  // ************
    if(isset($_GET['del'])){

    $date = date("Y-m-d");
    $user_id = $_SESSION['user_id'];
    $return_id = $_GET['del'];
    $purchase_id = $_GET['pur_id'];

    // Fetch items to delete from tbl_order_return 
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_serial_purchase_return where 
    return_id = '".$return_id."'")
    or die('Error:: ' . mysqli_error($conn));

    $item_array= array();
    while($t = mysqli_fetch_assoc($fetch_order_items)){
      $item_array[] = array(
        'item_code'=> $t['item_code']
      );
    }

    for($i = 0;$i<count($item_array);$i++){

      // update products
      $new_imei = mysqli_query($conn,"update tbl_serial_products set
      status = 1 where 
      item_code ='".$item_array[$i]['item_code']."'") 
      or die('Error:: ' . mysqli_error($conn));

      // update purchases
      $update_purchase = mysqli_query($conn,"update tbl_serial_purchases set
      purchase_return = 0 where 
      item_code ='".$item_array[$i]['item_code']."' and 
      purchase_id='".$purchase_id."'") 
      or die('Error:: ' . mysqli_error($conn));

      // delete order RETURN
      $order_return= mysqli_query($conn,"delete from tbl_serial_purchase_return 
      where item_code='".$item_array[$i]['item_code']."' 
      and purchase_id='".$purchase_id."'")
      or die('Error:: ' . mysqli_error($conn));

    // INPUT LOG STARTED
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
      '".$return_id."',
      'SERIAL PURCHASE RETURN DELETED',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$item_array[$i]['item_code']."'
      )")
      or die('Error:: ' . mysqli_error($conn));
    // INPUT LOG ENDED


    }

    header("location:serial_purchase_return_history.php");
  }

  // Select Supplier for return
  if(isset($_POST['select_supplier'])){
    header("location:serial_purchase_return.php?sup_id=".$_POST['sup_id']);
  }

?>
<?php include "../../header.php" ?>

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
              <h3 class="box-title">Serial Return Purchases</h3>
              <button type="button" class="btn btn-success pull-right" 
                data-toggle="modal" data-target="#modal-supplier">
                <i class="fa fa-plus"></i> New Return Purchase
              </button>
            </div>
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
                          <td><b>Return ID</b></td>
                          <td><b>Date</b></td>
                          <td><b>Supplier</b></td>
                          <td><b>Actions</b></td>
                          <td><b>Qty</b></td>
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

  </div>
  <!-- select supplier modal -->
  <div class="modal modal-default fade" id="modal-supplier">
    <div class="modal-dialog">
      <div class="modal-content">
      <form action="" method="POST">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">Danger Modal</h4>
        </div>
        <div class="modal-body">
          <label>Select Supplier</label>
            <select required class="form-control select2" required name="sup_id">
              <option value="">Select Supplier</option>
              <?php 
                $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers order by name");
              ?>
              <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
              <option value="<?php echo $row['supplier_id']; ?>">
              <?php echo $row['name']; ?> </option>
            <?php endwhile; ?>
            </select>
        </div>
        <div class="modal-footer">
          <button type="submit" name="select_supplier" 
          class="btn btn-default">Select</button>
        </div>
      </div>
      </form>
      <!-- /.modal-content -->
    </div>
    <!-- /.modal-dialog -->
  </div>
  <!-- /select supplier modal -->
</div>
  <!-- select supplier modal -->
  <div class="modal modal-default fade" id="modal-supplier">
    <div class="modal-dialog">
      <div class="modal-content">
      <form action="" method="POST">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">Danger Modal</h4>
        </div>
        <div class="modal-body">
          <label>Select Supplier</label>
            <select required class="form-control select2" required name="sup_id">
              <option value="">Select Supplier</option>
              <?php 
                $fetch_suppliers = mysqli_query($conn,"select * from tbl_suppliers");
              ?>
              <?php while($row = mysqli_fetch_assoc($fetch_suppliers)):?>
              <option value="<?php echo $row['supplier_id']; ?>">
              <?php echo $row['name']; ?> </option>
            <?php endwhile; ?>
            </select>
        </div>
        <div class="modal-footer">
          <button type="submit" name="select_supplier" 
          class="btn btn-default">Select</button>
        </div>
      </div>
      </form>
      <!-- /.modal-content -->
    </div>
    <!-- /.modal-dialog -->
  </div>
  <!-- /select supplier modal -->


<?php include $global_url."footer.php";?>
<script src="purchase-return-history-datatable-script.js"></script>

</body>
</html>