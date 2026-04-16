<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

$query1 = mysqli_query($conn,"Select * from tbl_suppliers  ORDER BY name");

// // INSERTING NEW customer
if(isset($_GET['delete_supplier'])){
  $query = mysqli_query($conn,"delete from tbl_suppliers where id=".$_GET['delete_supplier']);

  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
    date, user_id)
    values
    ('".$_GET['delete_supplier']."','DELETE SUPPLIER',
    '".$date."',".$user_id.")")
    or die('Error:: ' . mysqli_error($conn));

  header('location:manage_suppliers.php');
}

?>

<?php include "../header.php";
?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage Suppliers
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
                    <a href="new_supplier.php" class="<?php echo $delete_btn; ?>">
                      <button type="button" class="btn btn-success">New Supplier</button>
                    </a>
                  </div>
                  <div class="box-body">
                    <table id="example1" class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>City</th>
                          <th>Country</th>
                          <th>Address</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                      <?php $s_no=1; ?>
                        <?php while($row = mysqli_fetch_array($query1)):?>
                        <tr>
                          <td> <?php  echo $s_no++; ?></td>
                          <td><?php echo $row['supplier_id'] ?></td>
                          <td><?php echo $row['name'] ?></td>
                          <td><?php echo $row['phone'] ?></td>
                          <td><?php echo $row['city'] ?></td>
                          <td><?php echo $row['country'] ?></td>
                          <td><?php echo $row['address'] ?></td>
                          <td>
                              <div class="btn-group">
                                <a href="edit_supplier.php?edit=<?php echo $row['supplier_id'];?>">
                                  <button type="button" class="btn btn-warning"><i class="fa fa-pencil" name="edit_supplier"></i></button>
                                </a>
                                <a href="?delete_supplier=<?php echo $row['id']; ?>" class="del_supplier">
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
  
  $('.del_supplier').on('click',function(e){
    var c = confirm("Are you sure you want to delete?");
    if(!c){
      e.preventDefault();
    }
  });

</script>
</body>
</html>



