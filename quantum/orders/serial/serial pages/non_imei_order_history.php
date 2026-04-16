<?php include '../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../"; ?>
<?php 

  $query = mysqli_query($conn,"Select * from tbl_non_imei_orders group by order_id 
  order by id desc");

  // ************
  // DELETE order
  // ************
  if(isset($_GET['del'])){
   $order_id = $_GET['del'];

    // Fetch items to delete from tbl_non_imei_orders
    $fetch_order_items = mysqli_query($conn,"select * from 
    tbl_non_imei_orders where 
    order_id = '".$order_id."'")
    or die('Error:: ' . mysqli_error($conn));
    $item_array= array();

    while($t = mysqli_fetch_assoc($fetch_order_items)){
      $item_array[] = array(
        'item_qty' => $t['item_qty'],
        'item_code'=> $t['item_code']
      );
    }

    for($i = 0;$i<count($item_array);$i++){

      // update imei status
      $new_imei = mysqli_query($conn,"update tbl_non_imei_products set
      item_qty = item_qty + ".$item_array[$i]['item_qty']." 
      where item_code ='".$item_array[$i]['item_code']."'") 
      or die('Error:: ' . mysqli_error($conn));
    }

    $update_order_item= mysqli_query($conn,"delete from tbl_non_imei_orders 
      where order_id ='".$order_id."'")
      or die('Error:: ' . mysqli_error($conn));

    header("location:non_imei_order_history.php");
  }
?>

<?php include "../header.php";
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
              <h3 class="box-title">Non IMEI orders</h3>
              <a href="new_non_imei_order.php" class="btn btn-success pull-right">
              <i class="fa fa-plus"></i> New Order</a>
            </div>
            <!-- /.box-header -->
            <div class="box-body">
              <table id="example1" class="table table-bordered">
                <thead>
                  <tr>
                    <th>O.ID</th>
                    <th>Date</th>
                    <th>customer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <?php while($row = mysqli_fetch_assoc($query)): ?>
                  <tr>
                    <td><?php echo $row['order_id']; ?></td>
                    <td><?php echo $row['date']; ?></td>
                    <td>
                      <?php $get_customer = mysqli_query($conn,"select * from tbl_customers where customer_id = '".$row['customer_id']."'")
                      or die('Error: '.mysqli_error($conn)); ?>
                      <?php $customer = mysqli_fetch_assoc($get_customer); ?>
                      <?php echo $customer['name']; ?>
                    </td>
                    <td>
                      <a href="edit_order.php?pur_id=<?php echo $row['order_id']; ?>" 
                      class="hide btn btn-success">edit</a>
                      <a href="non_imei_order_details.php?ord_id=<?php echo $row['order_id']; ?>" class="btn btn-primary">
                      <i class="fa fa-search"></i></a>
                      <a href="?del=<?php echo $row['order_id']; ?>" 
                      class="del_btn btn <?php echo $delete_btn; ?>">
                      <i class="fa fa-remove"></i>
                      </a>
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


<!-- jQuery 2.2.3 -->
<script src="<?php echo $global_url;  ?>assets/js/jquery-ui.min.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/app.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/dashboard.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/demo.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/chart.min.js"></script>
<!-- Bootstrap 3.3.6 -->
<script src="<?php echo $global_url;  ?>assets/js/bootstrap.min.js"></script>
<!-- DataTables -->
<script src="<?php echo $global_url;  ?>assets/js/jquery.dataTables.min.js"></script>
<script src="<?php echo $global_url;  ?>assets/js/dataTables.bootstrap.min.js"></script>
<!-- page script -->
<script type="text/javascript">
  $('.del_btn').on('click',function(e){
    var userConfirm = confirm("Are you sure you want to Delete this order Record?");
    if(userConfirm == false){
      e.preventDefault();
    }
  });

</script>

</body>
</html>