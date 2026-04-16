<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php 

$query1 = mysqli_query($conn,"Select * from tbl_customers ORDER BY name");

// print_r(mysqli_fetch_assoc($query));
// die();

// // INSERTING NEW customer
if(isset($_GET['del'])){
  $query = mysqli_query($conn,"delete from tbl_customers where id=".$_GET['del']);


  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
    date, user_id)
    values
    ('".$_GET['del']."','DELETE CUSTOMER',
    '".$date."',".$user_id.")")
    or die('Error:: ' . mysqli_error($conn));

    header('location:manage_customers.php');
}

?>

<?php include "../header.php";
?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage Customers
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
                    <h3 class="box-title"></h3>
                    <a href="new_customer.php" class="<?php echo $delete_btn; ?>">
                      <button type="button" class="btn btn-success">New Customer</button>
                    </a>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>C.ID</th>
                          <th>Customer Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>City</th>
                          <th>Country</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php $s_no=1; ?>
                        <?php while($row = mysqli_fetch_array($query1)):?>
                        <tr>
                          <td><?php  echo $s_no++; ?></td>
                          <td><?php echo $row['customer_id'] ?></td>
                          <td><?php echo $row['name'] ?></td>
                          <td><?php echo $row['phone'] ?></td>
                          <td><?php echo $row['email'] ?></td>
                          <td><?php echo $row['city'] ?></td>
                          <td><?php echo $row['country'] ?></td>
                          <td>
                              <div class="btn-group">
                                <a href="edit_customer.php?edit=<?php echo $row['customer_id']; ?>">
                                  <button type="button" class="btn btn-warning"><i class="fa fa-pencil" name="edit_customer"></i></button>
                                </a>
                                <a href="manage_customers.php?del=<?php echo $row['id']; ?>" class="del_btn">
                                  <button type="button" name="del_customer" class="btn <?php echo $delete_btn; ?>"><i class="fa fa-times"></i></button>
                                </a>
                              </div>
                            </td>
                        </tr>
                        <?php endwhile;?>
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



<?php include $global_url."footer.php";?>
<script type="text/javascript">

  $('.del_btn').on('click',function(e){
    var userConfirm = confirm("Are you sure you want to Delete this Customer?");
    if(userConfirm === false){
      e.preventDefault();
    }
  });

</script>

</body>
</html>