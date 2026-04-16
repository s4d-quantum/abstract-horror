<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php require_once "../../shared/quantum_event_outbox.php"; ?>
<?php 

// ************
// DELETE order RETURN
// ************

if(isset($_GET['del'])){

  $return_id = $_GET['del'];
  $order_id = $_GET['ord_id'];
  $date = date("Y-m-d");
  $user_id = $_SESSION['user_id'];
  $return_items = array();

  $fetch_return_items = mysqli_query($conn,"select item_imei, order_id from 
  tbl_order_return where 
  return_id = '".$return_id."'")
  or die('Error:: ' . mysqli_error($conn));

  while($return_item = mysqli_fetch_assoc($fetch_return_items)){
    $purchase_query = mysqli_query($conn,"select tray_id, supplier_id from tbl_purchases
    where item_imei ='".$return_item['item_imei']."'
    order by id desc
    limit 1")
    or die('Error:: ' . mysqli_error($conn));
    $purchase_row = mysqli_fetch_assoc($purchase_query);

    $return_items[] = array(
      'item_imei' => $return_item['item_imei'],
      'order_id' => isset($return_item['order_id']) ? (int)$return_item['order_id'] : null,
      'tray_id' => $purchase_row ? $purchase_row['tray_id'] : null,
      'supplier_id' => $purchase_row ? $purchase_row['supplier_id'] : null
    );
  }

  // Fetch items to delete from tbl_non_imei_orders
  $fetch_order_items = mysqli_query($conn,"select * from 
  tbl_order_return where 
  return_id = '".$return_id."'")
  or die('Error:: ' . mysqli_error($conn));

  while($t = mysqli_fetch_assoc($fetch_order_items)){

    $new_imei = mysqli_query($conn,"update tbl_imei set 
    status = 0 where item_imei ='".$t['item_imei']."'") 
    or die('Error:: ' . mysqli_error($conn));

    $new_order_imei = mysqli_query($conn,"update tbl_orders set 
    order_return=0
    where item_imei ='".$t['item_imei']."' and 
    order_id='".$order_id."'") 
    or die('Error:: ' . mysqli_error($conn));
  }

  // INPUT LOG STARTED
  $fetch_log_items = mysqli_query($conn,"select * from 
  tbl_order_return where 
  return_id = '".$return_id."'")
  or die('Error:: ' . mysqli_error($conn));

  while($log = mysqli_fetch_assoc($fetch_log_items)){
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
    'IOR-".$return_id."',
    'IMEI ORDER RETURN DELETED',
    'QTY:1',
    '".$date."',
    ".$user_id.",
    '".$log['item_imei']."'
    )")
    or die('Error:: ' . mysqli_error($conn));

    $matching_return_item = null;
    for ($idx = 0; $idx < count($return_items); $idx++) {
      if ($return_items[$idx]['item_imei'] === $log['item_imei']) {
        $matching_return_item = $return_items[$idx];
        break;
      }
    }

    $payload = array(
      'legacy_return_id' => (int)$return_id,
      'legacy_goodsout_order_id' => $matching_return_item ? $matching_return_item['order_id'] : (int)$order_id,
      'legacy_sales_order_id' => null,
      'imei' => $log['item_imei'],
      'supplier_id' => $matching_return_item ? $matching_return_item['supplier_id'] : null,
      'tray_id' => $matching_return_item ? $matching_return_item['tray_id'] : null,
      'deleted_at' => $date,
      'source' => 'quantum',
      'operation' => 'sales_order_return_delete'
    );

    recordQuantumEvent(
      $conn,
      'sales.return_deleted',
      'device',
      $log['item_imei'],
      $payload,
      __FILE__,
      isset($_SESSION['user_id']) ? (string)$_SESSION['user_id'] : null,
      array((int)$return_id, $log['item_imei'], 'deleted')
    );
  }//while loop ended
  // INPUT LOG ENDED
  
  // Delete from TAC table
  $new_order_return = mysqli_query($conn,"delete from tbl_order_return where 
  return_id = '".$return_id."'")
  or die('Error:: '.mysqli_error($conn));


  header("location:order_return_history.php");
}

    // Select customer for return
  if(isset($_POST['select_customer'])){
    header("location:new_order_return.php?cust_id=".$_POST['cust_id']);
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
              <h3 class="box-title">Return orders</h3>
              <button type="button" class="btn btn-success pull-right" 
                data-toggle="modal" data-target="#modal-customer">
                <i class="fa fa-plus"></i> New Return Order
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
                              <label>Search</label>
                              <input type="text" class="form-control search-datatable">
                            </div>
                        </div>
                      </div>
                  </div>
                  <table class="table table-striped table-hover">
                    <thead>
                      <tr>
                        <td><b>Order ID</b></td>
                        <td><b>Customer</b></td>
                        <td><b>Date</b></td>
                        <td><b>Actions</b></td>
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


  <!-- select customer modal -->
  <div class="modal modal-default fade" id="modal-customer">
    <div class="modal-dialog">
      <div class="modal-content">
      <form action="" method="POST">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">Danger Modal</h4>
        </div>
        <div class="modal-body">
          <label>Select customer</label>
            <select required class="form-control" required name="cust_id">
              <option value="">Select customer</option>
              <?php 
                $fetch_customers = mysqli_query($conn,"select * from tbl_customers order by name");
              ?>
              <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
              <option value="<?php echo $row['customer_id']; ?>">
              <?php echo $row['name']; ?> </option>
            <?php endwhile; ?>
            </select>
        </div>
        <div class="modal-footer">
          <button type="submit" name="select_customer" 
          class="btn btn-default">Select</button>
        </div>
      </div>
      </form>
      <!-- /.modal-content -->
    </div>
    <!-- /.modal-dialog -->
  </div>
  <!-- /select customer modal -->


<?php include $global_url."footer.php";?>
<script src="order-return-history-datatable-script.js"></script>

</body>
</html>
