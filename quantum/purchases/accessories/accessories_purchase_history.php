<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php 

// // ************
// // DELETE PURCHASE
// // ************
  if(isset($_GET['del'])){

    $purchase_id = mysqli_real_escape_string($conn, $_GET['del']);
    $user_id = $_SESSION['user_id'];
    $date = date("Y-m-d");

    // Fetch total returned qty per product for this purchase (used to prevent stock drift on delete)
    $returned_qty_by_product = [];
    $returns_rs = mysqli_query(
      $conn,
      "SELECT product_id, SUM(item_qty) AS qty
       FROM tbl_accessories_purchase_return
       WHERE purchase_id = '".$purchase_id."'
       GROUP BY product_id"
    ) or die('Error:: ' . mysqli_error($conn));
    while ($r = mysqli_fetch_assoc($returns_rs)) {
      $returned_qty_by_product[(string)$r['product_id']] = (int)$r['qty'];
    }

    // delete purchase return record
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_accessories_purchases where purchase_id = '".$purchase_id."'")
    or die('Error:: ' . mysqli_error($conn));

    $item_array= array();
    while($t = mysqli_fetch_assoc($fetch_order_items)){
      $item_array[] = array(
        'item_qty' => $t['item_qty'],
        'item_code'=> $t['product_id']
      );
    }

    for($i = 0;$i<count($item_array);$i++){
      $product_id = (string)$item_array[$i]['item_code'];
      $purchased_qty = (int)$item_array[$i]['item_qty'];
      $returned_qty = isset($returned_qty_by_product[$product_id]) ? (int)$returned_qty_by_product[$product_id] : 0;
      if ($returned_qty > $purchased_qty) {
        die('Error: Cannot delete purchase because returned quantity exceeds purchased quantity for product ' . htmlspecialchars($product_id));
      }
      $net_remove_qty = $purchased_qty - $returned_qty;
      if ($net_remove_qty <= 0) {
        continue;
      }

      $update_items = mysqli_query($conn,"update tbl_accessories_products
      set item_qty = item_qty - ".$net_remove_qty." where 
      id=".$product_id)
      or die('Error:: ' . mysqli_error($conn));
      
    }

    // delete purchase return
    $delete_returns= mysqli_query($conn,"delete from tbl_accessories_purchase_return where 
    purchase_id ='".$purchase_id."'");

    // INPUT LOG STARTED
    $fetch_purchase_items = mysqli_query($conn,"select * from 
    tbl_accessories_purchases where 
    purchase_id = '".$purchase_id."'")
    or die('Error:: ' . mysqli_error($conn));
    $item_array= array();

    while($t = mysqli_fetch_assoc($fetch_purchase_items)){
      $product_id = (string)$t['product_id'];
      $purchased_qty = (int)$t['item_qty'];
      $returned_qty = isset($returned_qty_by_product[$product_id]) ? (int)$returned_qty_by_product[$product_id] : 0;
      $net_remove_qty = $purchased_qty - $returned_qty;

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
      'AP-".$purchase_id."',
      'ACCESSORIES PURCHASE DELETED',
      'QTY:".$net_remove_qty."',
      '".$date."',
      ".$user_id.",
      '".$product_id."'
      )")
      or die('Error:: ' . mysqli_error($conn));
  }//while loop ended
  // INPUT LOG ENDED

    // delete products
    $delete_purchase= mysqli_query($conn,"delete from tbl_accessories_purchases where 
    purchase_id ='".$purchase_id."'");
    
    header("location:accessories_purchase_history.php");
    
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
                    <h3 class="box-title">Accessories Purchases</h3>
                    <a href="new_accessories_purchase.php" class="btn btn-success pull-right">
                    <i class="fa fa-plus"></i> New Purchase</a>
                  </div>
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
                          <th>P.ID</th>
                          <th>Date</th>
                          <th>Supplier</th>
                          <th>Actions</th>
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
                  <?php $get_category = mysqli_query($conn,"select title, category_id 
                  from tbl_categories")
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
