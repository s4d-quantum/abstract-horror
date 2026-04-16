<?php //error_reporting(E_ALL & ~E_NOTICE); ?>
<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

  // BRANDS
  $get_brands_query = mysqli_query($conn,"select * from tbl_categories")
    or die('Error:: ' . mysqli_error($conn));


  $curr_date = date("Y-m-d");
  
  // *********
  // SUBMIT PURCHASE
  // *********
  if(isset($_POST['submit_brand'])){

    $item_brand = $_POST['item_brand'];
    $title = $_POST['item_title'];
    $user_id = $_SESSION['user_id'];
    $date = date('Y-m-d');

    // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (
    ref,
    details,
    date, 
    user_id)
    values
    (
    '".'BR'.$new_pur_id."',
    'NEW BRAND ACCESSORY ITEM',
    '".$date."',
    ".$user_id.")")
    or die('Error:: ' . mysqli_error($conn));

    $new_item = mysqli_query($conn,"insert into tbl_accessories_products 
    (title,item_brand,item_qty)
      values
      ('".$title."','".$item_brand."',0)")
      or die('Error:: ' . mysqli_error($conn));

    header("location:manage_accessories_brands.php");

  }

  // DEL BRAND
  if(isset($_GET['del'])){
    $del_brand = $_GET['del'];
    $del_brand_query = mysqli_query($conn,"delete from tbl_accessories_products 
    where id=".$del_brand)
    or die('Error:: ' . mysqli_error($conn));
  }

  // EDIT BRAND
  if(isset($_GET['edit_brand'])){
    $brand = $_GET['edit_brand'];
    $edit_brand_query = mysqli_query($conn,"select * from tbl_accessories_products 
    where id=".$brand)
    or die('Error:: ' . mysqli_error($conn));
    $edit_brand = mysqli_fetch_assoc($edit_brand_query);

    // print_r($edit_brand);
    // die();
    if(isset($_POST['submit_edit'])){
      $submit_edit_query = mysqli_query($conn,"update tbl_accessories_products set  
      title = '".$_POST['item_title']."', item_brand='".$_POST['item_brand']."' 
      where id=".$brand)
      or die('Error:: ' . mysqli_error($conn));

      header("location:manage_accessories_brands.php");
    }
  }

  // /EDIT BRAND

?>

<?php include "../../header.php" ?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <!-- col -->
      <?php if(!isset($_GET['edit_brand'])):?>
      <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">
        <div class="col-md-12">
          <!-- box started-->
            <div class="box box-warning">
              <div class="box-header">
                <h2 class="box-title">New Brand</h2>
              </div>
              <div class="box-body">
                <div class="col-md-4">
                  <div class="form-group">
                    <label>Select Brand</label>
                    <select required class="form-control select2" name="item_brand">
                      <option value="">Select brand</option>
                      <?php while($row = mysqli_fetch_assoc($get_brands_query)):?>
                      <option value="<?php echo $row['category_id']; ?>">
                      <?php echo $row['title']; ?> </option>
                    <?php endwhile; ?>
                    </select>
                  </div>
                </div>

                <div class="col col-md-6 col-sm-6">
                  <label for="" style="width:100%;">
                    Item Code / Title
                    <input type="text" name="item_title" 
                    style="margin-top:5px;"
                    class="form-control"
                    value="">
                  </label>
                </div>

                <input type="submit" name="submit_brand" 
                  style="margin-top:25px;"
                  class="btn btn-success" 
                  value="Submit" id="submit_brand">
              </div>

            </div>
            <!-- /.box-body -->
          </div>
          <!-- /.box -->
        </div>
        <!-- col -->

        <!-- box started-->
        <div class="box box-warning">
          <div class="box-header">
            <h2 class="box-title">Manage Brands</h2>
          </div>
          <div class="box-body">
            <table id="example1" class="table table-bordered">
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Item Code / Title</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <?php 
                
                  $get_items_query = mysqli_query($conn,"select * from 
                  tbl_accessories_products")
                  or die('Error:: ' . mysqli_error($conn));
                  while($row = mysqli_fetch_assoc($get_items_query)):?>
                <tr>
                  <td><?php 

                    $fetch_brand = mysqli_query($conn,"select * from tbl_categories where 
                    category_id = '".$row['item_brand']."'")
                    or die('Error: '.mysqli_error($conn));
                    $brand = mysqli_fetch_assoc($fetch_brand);
                    echo $brand['title']; ?></td>
                  <td><?php echo $row['title']; ?></td>
                  <td>
                    <a href="?edit_brand=<?php echo $row['id']; ?>" class="btn btn-warning">
                      <i class="fa fa-pencil"></i></a>
                    <a href="?del=<?php echo $row['id']; ?>" class="btn <?php echo $delete_btn; ?> del_btn">
                      <i class="fa fa-close"></i></a>
                  </td>
                </tr>
                <?php endwhile;?>
              </tbody>
          </div>
        </div>
      </form>
      <?php endif; ?>

      <!-- EDIT BRAND -->
      <?php if(isset($_GET['edit_brand'])):?>
      <form enctype="multipart/form-data" method="post" id="edit_brand" action="">
        <div class="col-md-12">
          <!-- box started-->
            <div class="box box-warning">
              <div class="box-header">
                <h2 class="box-title">Edit Brand</h2>
              </div>
              <div class="box-body">

                <div class="col-md-4">
                  <div class="form-group">
                    <label>Select Brand</label>
                    <select required class="form-control select2" name="item_brand">
                      <option value="">Select brand</option>
                      <?php while($row = mysqli_fetch_assoc($get_brands_query)):?>
                      <option value="<?php echo $row['category_id']; ?>" 
                      <?php echo $edit_brand['item_brand'] == $row['category_id'] ? 'selected':''; ?>>
                      <?php echo $row['title']; ?> </option>
                      <?php endwhile; ?>
                    </select>
                  </div>
                </div>

                <div class="col col-md-6 col-sm-6">
                  <label for="" style="width:100%;">
                    Item Code / Title
                    <input type="text" value="<?php echo $edit_brand['title']; ?>" 
                    class="form-control" name="item_title">
                  </label>
                </div>

                <input type="submit" name="submit_edit" 
                  style="margin-top:18px;"
                  class="btn btn-success" 
                  value="Submit" id="submit_edit">

            </div>
            <!-- /.box-body -->
          </div>
          <!-- /.box -->
        </div>
      </form>
      <?php endif; ?>
      <!-- EDIT BRAND -->

    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->

  <!-- error beep -->
  <audio id="myAudio">
    <source src="../../error-beep.mp3" type="audio/mp3">
      Your browser does not support the audio element.
  </audio>
  <!-- /error beep -->

  </div>
  <!-- /.content-wrapper -->


<?php include $global_url."footer.php";?>

<script>
 // date picker
  $('#purchase_date').datepicker({
    autoclose: true,
    format:'yyyy/mm/dd'
  });

  $('.del_btn').on('click',function(e){
    var userConfirm = confirm("Are you sure you want to Delete this Purchase Record?");
    if(userConfirm == false){
      e.preventDefault();
    }
  });

</script>
</body>
</html>