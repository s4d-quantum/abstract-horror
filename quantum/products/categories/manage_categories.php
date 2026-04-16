<?php $global_url="../../"; ?>
<?php include $global_url.'db_config.php';  ?>
<?php include $global_url."authenticate.php" ?>
<?php 

$query = mysqli_query($conn,"select * from tbl_categories");

if(isset($_GET['del'])){
  $query = mysqli_query($conn,"delete from tbl_categories where category_id='".$_GET['del']."'");
  header('location:manage_categories.php');
}

?>
<?php include $global_url."header.php";

?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Manage Categories
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
                    <a href="new_category.php" class="<?php echo $delete_btn; ?>">
                      <button type="button" class="btn btn-success">
                        <i class="fa fa-plus  "></i> New Category</button>
                    </a>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>C.ID</th>
                          <th>Title</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php $s_no=1; ?>
                        <?php while($row=mysqli_fetch_assoc($query)): ?>
                        <tr>
                          <td><?php echo $s_no++; ?></td>
                          <td><?php echo $row['category_id'] ?></td>
                          <td><?php echo $row['title']; ?></td>
                          <td>
                            <a href="edit_category.php?edit=<?php echo $row['category_id']; ?>" class="btn btn-success">Edit</a>
                            <a href="manage_categories.php?del=<?php echo $row['category_id']; ?>" class="del_btn btn <?php echo $delete_btn; ?>">Delete</a>
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
<script type="text/javascript">

  $('.del_btn').on('click',function(e){
    console.log("del")
    var userConfirm = confirm("Are you sure you want to Delete?");
    if(userConfirm == false){
      e.preventDefault();
    }
  });

</script>

</body>
</html>