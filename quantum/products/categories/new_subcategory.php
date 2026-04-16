<?php $global_url="../../"; ?>
<?php include $global_url.'db_config.php';  ?>
<?php include $global_url."authenticate.php" ?>
<?php 

$cur_date = date('Y-m-d');

// DISPLAYING CATEGORY ID
$new_order_id_query = mysqli_query($conn,"Select max(id) from tbl_subcategories")
or die('Error:: ' . mysqli_error($conn));
$order_id_result = mysqli_fetch_assoc($new_order_id_query);
$new_pro_id = 'SCAT'.($order_id_result['max(id)']+1);

if(isset($_POST['submit_category'])){
  $name = $_POST['category_name'];
  $category_id = $_POST['category_id'];

  $new_subcategory_query = mysqli_query($conn,"insert into tbl_subcategories (category_id,
  subcategory_id,title) values('".$category_id."','".$new_pro_id."','".$name."')")
  or die('Error:: ' . mysqli_error($conn));

  $new_product_query = mysqli_query($conn,"insert into tbl_products (subcategory_id,
  item_qty) values('".$new_pro_id."',0)")
  or die('Error:: ' . mysqli_error($conn));

  header("location:manage_subcategories.php");

}

?>
<?php include $global_url."header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
      <h1>
        New Model
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
                <label>Sub Category ID</label>
                <input type="text" name="category_name" class="form-control" 
                value="<?php echo $new_pro_id; ?>" disabled>
              </div>
            </div>
          <div class="col col-md-3">
            <label>Category</label>
            <select name="category_id" class="form-control" required>
              <option value>Select Category</option>
              <?php $get_categories = mysqli_query($conn,"select * from tbl_categories"); ?>
              <?php while($row=mysqli_fetch_assoc($get_categories)): ?>
              <option value="<?php echo $row['category_id'] ?>"><?php echo $row['title'] ?></option>
              <?php endwhile; ?>
            </select>
          </div>
            <div class="col-md-5">
              <div class="form-group">
                <label>Model Name</label>
                <input type="text" required name="category_name" class="form-control">
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