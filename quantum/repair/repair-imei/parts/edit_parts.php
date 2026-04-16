

<?php include '../../../db_config.php';  ?>
<?php $global_url="../../../"; ?>
<?php include "../../../authenticate.php" ?>
<?php 

  $item_code = $_GET['item_code'];
  $pid = $_GET['pid'];

  
   // fetch brands/categories
   $fetch_categories = mysqli_query($conn,"select * from tbl_categories");
 
  // $fetch_basic_data = mysqli_query($conn,"select id, title, item_brand, item_qty from 
  // tbl_imei_sales_orders where 
  // order_id=".$order_id)
  //   or die('Error:: ' . mysqli_error($conn));
  // $fetch_data = mysqli_fetch_assoc($fetch_basic_data);

  // $fetch_edit_data = mysqli_query($conn,"
  // SELECT 
  // item_code, 
  // purchase_id,
  // part_id,
  // part_qty
  
  // FROM tbl_repair_imei_products as pro 
  // inner join tbl_repair_imei_parts as parts 
  // on pro.item_code = parts.item_code")
  // or die('Error:: ' . mysqli_error($conn));
  // $fetch_data = mysqli_fetch_assoc($fetch_edit_data);

  

?>
<?php include "../../../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper no-print">
    <!-- Content Header (Page header) -->
    <section class="content-header">
      <h1>
        Edit Repair Parts# <?php echo $item_code; ?>
      </h1>
    </section>

    <!-- Main content -->
    <section class="content">
      <div class="row">

      <input type="text" class="purchase_id hidden" value="<?php echo $pid; ?>" />
      <input type="text" class="item_code hidden" value="<?php echo $item_code; ?>" />

        <!-- form started -->
        <form enctype="multipart/form-data" action="" method="post">

        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">

                <div class="box">
                  <div class="box-header">
                    <div class="row">
                      <input type="text" name="purchase_id" class="form-control purchase_id hide" 
                        value="<?php echo $new_pid;?>">

                    <!-- loader  -->
                    <div class="form-group col col-md-2 loading-spinner">
                      <br>
                      <i style="margin-top:15px" class="fa fa-spinner fa-spin"></i>&nbsp;Loading Parts..
                    </div>
                    <!-- loader  -->

                    </div>
                    <h3 class="box-title">Filtered Result</h3>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body" style="max-height:400px; overflow-y:scroll;">

                    <table id="filtered_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Brand</th>
                          <th>Color</th>
                          <th>Qty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody></tbody>
                    </table>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->

                <!-- user id  -->
                <input type="text" class="hidden user_id" value="<?php echo $_SESSION['user_id']; ?>">

                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Selected Items</h3>                      
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="selected_table" class="table table-bordered">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Brand</th>
                          <th>Color</th>
                          <th>Qty</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colspan="9">
                          <div class="total-selected"><b>Total:</b> <span></span></div>
                            <button class="btn-lg btn btn-success pull-right submit-btn" name="submit">Submit</button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->

                <select required class="fetch_categories hide">
                  <?php while($item = mysqli_fetch_assoc($fetch_categories)):?>
                    <option value="<?php echo $item['category_id'];?>">
                      <?php echo $item['title']; ?></option>
                  <?php endwhile; ?>
                </select>

              </div>
            </div>
          </section>
        </div> <!-- col -->

        </form>
        <!-- /.form -->

      </div>
      <!-- /.row -->
    </section>
    <!-- /.content -->
  </div>
  <!-- /.content-wrapper -->


<?php include $global_url."footer.php";?>
<script src="edit_parts_script.js"></script>
<script>
  window.console.log = () => {}
</script>

</body>
</html>