<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

// fetch customers
$fetch_customers = mysqli_query($conn,"select * from tbl_customers order by name");

// // ************
// // DELETE order
// // ************
  if(isset($_GET['del'])){

    $order_id = $_GET['del'];
    $user_id = $_SESSION['user_id'];
    $date = date("Y-m-d");

    // UPDATE PRODUCTS QTY
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_serial_orders where order_id = '".$order_id."'")
    or die('Error:: ' . mysqli_error($conn));

    $item_array= array();
    while($t = mysqli_fetch_assoc($fetch_order_items)){
      $item_array[] = array(
        'item_code'=> $t['item_code']
      );
    }

    for($i = 0;$i<count($item_array);$i++){
 
      $update_items = mysqli_query($conn,"update tbl_serial_products
      set status = 1 where 
      item_code='".$item_array[$i]['item_code']."'")
      or die('Error:: ' . mysqli_error($conn));
    }

    // delete order return
    $delete_returns= mysqli_query($conn,"delete from tbl_serial_order_return 
    where order_id ='".$order_id."'")
    or die('Error:: ' . mysqli_error($conn));
    
    // INPUT LOG STARTED
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_serial_orders where 
    order_id = '".$order_id."'")
    or die('Error:: ' . mysqli_error($conn));
    $item_array= array();

    while($t = mysqli_fetch_assoc($fetch_order_items)){
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
      'SO-".$order_id."',
      'SERIAL ORDER DELETED',
      'QTY:1',
      '".$date."',
      ".$user_id.",
      '".$t['item_code']."'
      )")
      or die('Error:: ' . mysqli_error($conn));

    }
    //while loop ended
    // INPUT LOG ENDED

    // delete products
    $delete_order= mysqli_query($conn,"delete from tbl_serial_orders where 
    order_id ='".$order_id."'")
    or die('Error:: ' . mysqli_error($conn));

    header("location:serial_order_history.php");
    
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
                    <h3 class="box-title">Serial orders</h3>
                    <!-- <a href="new_serial_order.php" class="btn btn-success pull-right">
                    <i class="fa fa-plus"></i> New order</a> -->
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">


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
                            <select required class="form-control select2 search_customer">
                              <option value="">Select Customer</option>
                              <?php while($row = mysqli_fetch_assoc($fetch_customers)):?>
                              <option value="<?php echo $row['customer_id']; ?>">
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
                              <td><b>Order ID</b></td>
                              <td><b>Date</b></td>
                              <td><b>Customer</b></td>
                              <td><b>Units Confirmed</b></td>
                              <td><b>Delivered</b></td>
                              <td><b>PO Ref#</b></td>
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
<script src="order-history-datatable-script.js"></script>
<script>

  // unit confirmed change
$(document).on("click", ".change_units_btn", function (e) {
  let is_unit_confirmed = $(this).siblings(".change_units").val();
  let oid = $(this).parent().parent().siblings().children(".order_id").val();
  if (oid) {
    $.ajax({
      type: "POST",
      url: "includes/update_units_confirmed.php",
      data: {
        order_id: oid,
        is_unit_confirmed,
      },
      success: function (data) {
        location.reload();
      },
    });
  } else {
    console.log("sorry");
  }
});

  // unit confirmed change
  $(document).on("click", ".change_delivery_btn", function (e) {
  let is_delivered = $(this).siblings(".change_delivery_status").val();
  let oid = $(this).parent().parent().siblings().children(".order_id").val();
  let userId = $(".user_id").val();

  if (oid) {
    $.ajax({
      type: "POST",
      url: "includes/update_delivery_status.php",
      data: {
        order_id: oid,
        is_delivered,
        user_id:userId
      },
      success: function (data) {
        location.reload();
      },
    });
  } else {
    console.log("sorry");
  }
});


</script>
</body>
</html>