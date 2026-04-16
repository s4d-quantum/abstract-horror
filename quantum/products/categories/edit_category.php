<?php $global_url="../../"; ?>
<?php include $global_url.'db_config.php';  ?>
<?php include $global_url."authenticate.php" ?>
<?php 

$query = mysqli_query($conn,"Select title from tbl_categories where category_id='".$_GET['edit']."'");
$result = mysqli_fetch_assoc($query);

if(isset($_POST['submit_category'])){
  $name = $_POST['category_name'];

  $new_product_query = mysqli_query($conn,"update tbl_categories set title='".$name."' where category_id='".$_GET['edit']."'")
  or die('Error:: ' . mysqli_error($conn));
  header("location:manage_categories.php");
}

?>
<?php include $global_url."header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        Edit Category
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">

      <!-- SELECT2 EXAMPLE -->
      <div class="box box-default">
        <div class="box-header with-border">
          <h3 class="box-title">General</h3>
        </div>

      <!-- form started -->
        <form enctype="multipart/form-data" action="" method="post">

        <!-- /.box-header -->
        <div class="box-body">
          <div class="row">
            <div class="col-md-5">
              <div class="form-group">
                <label>Category Name</label>
                <input type="text" name="category_name" class="form-control" required 
                value="<?php echo $result['title']; ?>">
              </div>
            </div>


          </div>
          <!-- /.row -->

        </div>
        <!-- /.box-body -->
      </div>
      <!-- /.box -->


      <div class="row">
        <div class="col-md-12">
          <input type="submit" name="submit_category" value="Save Category" class="btn btn-lg btn-success pull-right">
      </div>

      </div>
      <!-- row -->

    </form>
    <!-- form ended -->

    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->


<?php include $global_url."footer.php";?>
