<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

// ************
// DELETE PURCHASE RETURN
// ************
  if(isset($_GET['del'])){

    $return_id = $_GET['del'];
    $purchase_id = $_GET['pur_id'];
    $date = date("Y-m-d");
    $user_id = $_SESSION['user_id'];

    // Fetch items to delete from tbl_purchase_return 
    $fetch_purchase_items = mysqli_query($conn,"select * from 
    tbl_parts_purchase_return where 
    return_id = '".$return_id."'")
    or die('Error:: ' . mysqli_error($conn));

    $item_array= array();
    while($t = mysqli_fetch_assoc($fetch_purchase_items)){
      $item_array[] = array(
        'item_qty' => $t['item_qty'],
        'item_code'=> $t['product_id']
      );
    }

    for($i = 0;$i<count($item_array);$i++){

      // update products qty
      $new_imei = mysqli_query($conn,"update tbl_parts_products set
      item_qty = item_qty + ".$item_array[$i]['item_qty']." 
      where id =".$item_array[$i]['item_code']) 
      or die('Error:: ' . mysqli_error($conn));

    }//for loop ended

      // INPUT LOG STARTED
      $fetch_purchase_items = mysqli_query($conn,"select * from 
      tbl_parts_purchase_return where 
      return_id = '".$return_id."'")
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
        'PPR-".$purchase_id."',
        'PARTS PURCHASE RETURN DELETED',
        'QTY:".$t['item_qty']."',
        '".$date."',
        ".$user_id.",
        '".$t['product_id']."'
        )")
        or die('Error:: ' . mysqli_error($conn));
      }//while loop ended
      // INPUT LOG ENDED

      // delete order RETURN
      $order_return= mysqli_query($conn,"delete from tbl_parts_purchase_return 
      where return_id='".$return_id."'")
      or die('Error:: ' . mysqli_error($conn));


    header("location:parts_purchase_return_history.php");

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
              <h3 class="box-title">Parts Returns</h3>
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
                        <td><b>Return ID</b> </td>
                        <td><b>Supplier</b> </td>
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


<?php include $global_url."footer.php";?>
<script src="purchase-return-history-datatable-script.js"></script>

</body>
</html>