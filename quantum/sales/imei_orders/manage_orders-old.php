<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php 

$query = mysqli_query($conn,"select

order_id,
customer_id,
date,
is_completed,
goodsout_order_id,
user_id

from tbl_imei_sales_orders
group by order_id ORDER BY order_id desc");

?>
<?php include "../../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Manage IMEI Sales Orders
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
                <div class="box-header">
                  <a href="new_order.php" class="btn btn-success pull-right">
                    <i class="fa fa-plus"></i> New Sales Order</a>
                </div>
                <!-- /.box-header -->
                <div class="box-body">
                  <table id="example1" class="table table-bordered">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order#</th>
                        <th>Customer</th>
                        <th>User</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php while($row=mysqli_fetch_assoc($query)): ?>
                      <tr>
                        <td><?php echo $row['date']; ?></td>
                        <td><?php echo $row['order_id']; ?></td>
                        <td>
                          <?php $get_customer = mysqli_query($conn,"select * 
                              from tbl_customers where customer_id = '".$row['customer_id']."'")
                              or die('Error: '.mysqli_error($conn)); ?>
                          <?php $customer = mysqli_fetch_assoc($get_customer); ?>
                          <?php echo $customer['name']; ?>
                        </td>
                        <td>
                          <?php 
                              mysqli_select_db($conn, 's4d_user_accounts');                    
                              $user_Details = mysqli_query($conn,"select user_name from tbl_accounts where
                              user_id=".$row['user_id'])
                              or die('Error: '.mysqli_error($conn));
                              $name = mysqli_fetch_assoc($user_Details);
                              echo $name['user_name'];
                              mysqli_select_db($conn, $_SESSION['user_db']);                    
                              ?></td>
                        <td>
                          <?php if($row['is_completed'] == 1): ?>
                          <a href="../../orders/imei/order_details.php?ord_id=<?php echo $row['goodsout_order_id'];?>"
                            class="btn btn-warning"> <i class="fa fa-search"></i> View</a>
                          <?php endif; ?>
                          <?php if($row['is_completed'] != 1): ?>
                          <a href="edit_order.php?ord_id=<?php echo $row['order_id']; ?>" class="btn btn-info">Edit</a>
                          <a href="../../orders/imei/new_order.php?sales_order=<?php echo $row['order_id']."&cust=".$row['customer_id']; ?>"
                            class="btn btn-primary">New IMEI Goodsout</a>
                          <?php endif; ?>
                        </td>
                      </tr>
                      <?php endwhile; ?>
                    </tbody>
                  </table>
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
<div class="modal modal-default fade" id="view_details">
  <div class="modal-dialog">
    <div class="modal-content">
      <form action="" method="POST">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title">Order details</h4>
        </div>
        <div class="modal-body">
          sample text...
        </div>
        <div class="modal-footer">
          <button type="submit" name="select_customer" class="btn btn-default">Cancel</button>
        </div>
    </div>
    </form>
    <!-- /.modal-content -->
  </div>
  <!-- /.modal-dialog -->
</div>
<!-- /select customer modal -->


<?php include $global_url."footer.php";?>

<script type="text/javascript">
$('.del_btn').on('click', function(e) {
  console.log("del")
  var userConfirm = confirm("Are you sure you want to Delete?");
  if (userConfirm == false) {
    e.preventDefault();
  }
});

// $("#example1").DataTable({
//   "order": [[ 1, 'dsc' ]]
// });
</script>

</body>

</html>