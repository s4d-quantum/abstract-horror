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
      

    // to insert multiple items in single column use IMPLODE
    // to fetch multiple items and separate them use EXPLODE  
    // $item_tac =implode(",",$_POST['item_tac']);
    $item_tac = $_POST['item_tac'];

    // print_r($item_tac);

    // die();
 

    // INPUT LOG
    $new_log = mysqli_query($conn,"insert into tbl_log (
    ref,
    details,
    date, 
    user_id)
    values
    (
    '".'BR'.$new_pur_id."',
    'NEW BRAND PARTS ITEM',
    '".$date."',
    ".$user_id.")")
    or die('Error:: ' . mysqli_error($conn));

    $new_item = mysqli_query($conn,"insert into tbl_parts_products 
    (
      title,
      item_brand,
      item_color, 
      item_tac,
      item_qty
      )
      values
      (
        '".$title."',
        '".$item_brand."',
        '".$_POST['item_color']."',
        '".$item_tac."',
        0
      )")
      or die('Error:: ' . mysqli_error($conn));

    header("location:manage_parts_brands.php");

  }

  // DEL BRAND
  if(isset($_GET['del'])){
    $del_brand = $_GET['del'];
    $del_brand_query = mysqli_query($conn,"delete from tbl_parts_products 
    where id=".$del_brand)
    or die('Error:: ' . mysqli_error($conn));
  }

  // EDIT BRAND
  if(isset($_GET['edit_brand'])){      
    $brand = $_GET['edit_brand'];
    $edit_brand_query = mysqli_query($conn,"select * from tbl_parts_products 
    where id=".$brand)
    or die('Error:: ' . mysqli_error($conn));
    $edit_brand = mysqli_fetch_assoc($edit_brand_query);

    // print_r($edit_brand);
    // die();
    if(isset($_POST['submit_edit'])){

      $item_tac =implode(",",$_POST['item_tac']);
      
    // print_r($item_tac);

    // die();

      $submit_edit_query = mysqli_query($conn,"update tbl_parts_products set  
      title = '".$_POST['item_title']."', 
      item_brand='".$_POST['item_brand']."',
      item_color='".$_POST['item_color']."',
      item_tac='".$item_tac."'       
      where id=".$brand)
      or die('Error:: ' . mysqli_error($conn));

      header("location:manage_parts_brands.php");
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

              <div class="row">
                <div class="col-md-3">
                  <div class="form-group">
                    <label>Select Brand</label>
                    <select required class="form-control select2 item_brand" name="item_brand">
                      <option value="">Select brand</option>
                      <?php while($row = mysqli_fetch_assoc($get_brands_query)):?>
                      <option value="<?php echo $row['category_id']; ?>">
                        <?php echo $row['title']; ?> </option>
                      <?php endwhile; ?>
                    </select>
                  </div>
                </div>

                <div class="col-md-3">
                  <div class="form-group">
                    <label>Select Tac</label>
                    <div class="hide prev-selected-tacs"></div>
                    <select required multiple class="form-control select2 item_tac" name="item_tac">
                      <option value="">Select Tac</option>
                    </select>
                  </div>
                </div>

                <div class="col col-md-3 col-sm-3">
                  <label for="" style="width:100%;">
                    Item Title
                    <input type="text" name="item_title" style="margin-top:5px;" class="form-control" value="">
                  </label>
                </div>

                <div class="col col-md-3 col-sm-3">
                  <label for="" style="width:100%;">
                    Color
                    <input type="text" name="item_color" style="margin-top:5px;" class="form-control" value="">
                  </label>
                </div>
              </div>

              <div class="row">
                <div class="col col-md-12">
                  <input type="submit" name="submit_brand" style="margin-top:25px;"
                    class="btn btn-success btn-lg pull-right" value="Submit" id="submit_brand">
                </div>
              </div>

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
              <th>Tac</th>
              <th>Item Title</th>
              <th>Color</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <?php 
                
                  $get_items_query = mysqli_query($conn,"select * from 
                  tbl_parts_products where char_length(item_tac) > 0")
                  or die('Error:: ' . mysqli_error($conn));
                  while($row = mysqli_fetch_assoc($get_items_query)):?>
            <tr>
              <td><?php 
                    $fetch_brand = mysqli_query($conn,"select * from tbl_categories where 
                    category_id = '".$row['item_brand']."'")
                    or die('Error: '.mysqli_error($conn));
                    $brand = mysqli_fetch_assoc($fetch_brand);
                    echo $brand['title']; ?>
              </td>

              <!-- show tacs  -->
              <td>
                <!-- if single tac  -->
                <?php 
                    // echo strpos($row['item_tac'],',') === false;
                    // echo $row['item_tac'];
                    
                    ?>
                <?php if(strpos($row['item_tac'],',') === false): ?>
                <label class="label label-primary" style="margin-right:2px;">
                  <?php
                      $tac_title = mysqli_query($conn,"select item_details from tbl_tac where 
                      item_tac = '".$row['item_tac']."'")
                      or die('Error: '.mysqli_error($conn));
                      $title = mysqli_fetch_assoc($tac_title);
                      echo strlen($title['item_details']) > 0 ? $title['item_details'] :  $row['item_tac'];
                            // echo 'me';          
                    ?>
                  <label>

                    <?php endif; ?>
                    <?php if(strpos($row['item_tac'],',') !== false): ?>


                    <!-- if multiple tacs  -->
                    <?php 
                      $tacs = explode(",", $row['item_tac']); 
                      // print_r($tacs);
                      $tacTitles = [];
                      foreach ($tacs as $tac){

                        // fetch tac title 
                        $tac_title = mysqli_query($conn,"select item_details from tbl_tac where 
                        item_tac = '".$tac."'")
                        or die('Error: '.mysqli_error($conn));
                        // collect all titles 
                        $title = mysqli_fetch_assoc($tac_title);
                        array_push($tacTitles, $title['item_details']);

                      } //end foreach

                      // remove duplicate titles 
                      // print_r($tacTitles);
                      // die();
                      $tacTitles = array_unique($tacTitles);
                      foreach ($tacTitles as $title):  
                    ?>
                    <label class="label label-primary" style="margin-right:3px;">
                      <?php 
                          echo $title; 
                          // echo 'you';
                          ?>
                    </label>
                    <?php endforeach; ?>
                    <?php endif; ?>

              </td>

              <!-- item title  -->
              <td><?php echo $row['title']; ?></td>
              <td><?php echo $row['item_color']; ?></td>

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

            <div class="row">
              <div class="col-md-3">
                <div class="form-group">
                  <label>Select Brand</label>
                  <select required class="form-control select2 item_brand" name="item_brand">
                    <option value="">Select brand</option>
                    <?php while($row = mysqli_fetch_assoc($get_brands_query)):?>
                    <option value="<?php echo $row['category_id']; ?>"
                      <?php echo $edit_brand['item_brand'] == $row['category_id'] ? 'selected':''; ?>>
                      <?php echo $row['title']; ?> </option>
                    <?php endwhile; ?>
                  </select>
                </div>
              </div>

              <div class="col-md-3">
                <div class="form-group">
                  <label>Select Tac</label>
                  <!-- prev selected items   -->
                  <div class="prev-selected-tacs hide"><?php echo $edit_brand['item_tac'];?></div>
                  <select required multiple class="form-control select2 item_tac" name="item_tac[]">
                    <option value="">Select brand</option>
                  </select>
                </div>
              </div>

              <div class="col col-md-3 col-sm-3">
                <label for="" style="width:100%;">
                  Item Title
                  <input type="text" value="<?php echo $edit_brand['title']; ?>" class="form-control" name="item_title">
                </label>
              </div>

              <div class="col col-md-3 col-sm-3">
                <label for="" style="width:100%;">
                  Color
                  <input type="text" name="item_color" style="margin-top:5px;" class="form-control"
                    value="<?php echo $edit_brand['item_color']; ?>">
                </label>
              </div>
            </div>


            <div class="row">
              <div class="col col-md-12">
                <input type="submit" name="submit_edit" style="margin-top:25px;"
                  class="btn btn-success btn-lg pull-right" value="Submit" id="submit_edit">
              </div>
            </div>

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
<script src="manage_parts_brands_script.js"></script>
<script>
// add pagination and search 
$('#example1').dataTable();

// remove main-footer element as it doesnot look useful here yet
document.querySelector('.main-footer').style.display = 'none';
</script>
</body>

</html>