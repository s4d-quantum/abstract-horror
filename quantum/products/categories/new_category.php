<?php $global_url="../../"; ?>
<?php include $global_url.'db_config.php';  ?>
<?php include $global_url."authenticate.php" ?>
<?php 

$cur_date = date('Y-m-d');

// DISPLAYING CATEGORY ID
$new_order_id_query = mysqli_query($conn,"Select max(id) from tbl_categories")
or die('Error:: ' . mysqli_error($conn));

$order_id_result = mysqli_fetch_assoc($new_order_id_query);
$new_cat_id = 'CAT'.($order_id_result['max(id)']+1);

if(isset($_POST['submit_category'])){
  $name = $_POST['category_name'];

  $new_product_query = mysqli_query($conn,"insert into tbl_categories (category_id,title) 
  values('".$new_cat_id."','".$name."')");
  header("location:manage_categories.php");

}

?>
<?php include $global_url."header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        New Category
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
            <div class="col-md-2">
              <div class="form-group">
                <label>Category ID</label>
                <input type="text" name="category_name" class="form-control" value="<?php echo $new_cat_id; ?>" disabled>
              </div>
            </div>
            <div class="col-md-5">
              <div class="form-group">
                <label>Category Name</label>
                <input type="text" name="category_name" class="form-control">
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
</body>
</html>