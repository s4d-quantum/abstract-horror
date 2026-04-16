<?php $global_url="../../"; ?>
<?php include $global_url.'db_config.php';  ?>
<?php include $global_url."authenticate.php" ?>
<?php 

$query = mysqli_query($conn,"select * from tbl_subcategories");

// get total items count of every subcategory
$get_category_items = mysqli_query($conn,"select * from tbl_products")
or die('Error:: ' . mysqli_error($conn));

if(isset($_GET['del'])){

  $category_id = $_GET['del'];
  $del_category = mysqli_query($conn,"delete from tbl_subcategories where 
  subcategory_id='".$category_id."'")
  or die('Error:: ' . mysqli_error($conn));

}

?>
<?php include $global_url."header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage Subcategories
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
                    <a href="new_subcategory.php" class="">
                      <button type="button" class="btn btn-success">New Subcategory</button>
                    </a>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Item.ID</th>
                          <th>Item Title</th>
                          <th>Category</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php $s_no=1; ?>
                        <?php while($row=mysqli_fetch_assoc($query)): ?>
                        <tr>
                          <td><?php echo $s_no++; ?></td>
                          <td><?php echo $row['subcategory_id'] ?></td>
                          <td><?php echo $row['title']; ?></td>
                          <?php $get_category = mysqli_query($conn,"select * from tbl_categories where category_id ='".$row['category_id']."'"); ?>
                          <?php $qty = mysqli_fetch_assoc($get_category); ?>
                          <td><?php echo $qty['title']; ?></td>
                          <td>
                            <a href="edit_subcategory.php?edit=<?php echo $row['subcategory_id']; ?>" class="btn btn-success">Edit</a>
                            <a href="manage_subcategories.php?del=<?php echo $row['subcategory_id']; ?>" class="del_btn btn <?php echo $delete_btn; ?>">Delete</a>
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


<?php include $global_url."footer.php";?>
</body>
</html>