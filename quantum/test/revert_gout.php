<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

  // fetch suppliers
  $fetch_imeis = mysqli_query($conn,"select * from tbl_orders where order_id=10034");

  if(isset($_POST['submit_btn'])){
    
    // delete from tblorders  
    $new_order_input = mysqli_query($conn,"DELETE from tbl_orders where order_id=10034")
    or die('Error:: '.mysqli_error($conn));

    // delete from tbl sales orders 
    $update_sales_order = mysqli_query($conn,"delete from tbl_imei_sales_orders 
      where order_id = 6602")
    or die('Error:: '.mysqli_error($conn));
        

      // INSERT TO order INVENTORY TBL
    for($i = 0;$i<count($_POST['imei_field']);$i++){

      // revert each imei in inventory 
      $new_imei = mysqli_query($conn,"update tbl_imei set status=1 
      where item_imei ='".$_POST['imei_field'][$i]."'") 
      or die('Error:: ' . mysqli_error($conn));

    }


  }
?>
<?php include "../header.php";?>


<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper no-print">
  <!-- Main content -->
  <section class="content">
    <div class="row">
      <!-- Main content -->
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">

              <!-- /.box-header -->
              <form enctype="multipart/form-data" method="post" id="confirm_order" action="">
                <div class="box-body">
                  <table id="items_table" class="table table-bordered">
                    <thead>
                      <tr>
                        <th>IMEI</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php while($row = mysqli_fetch_assoc($fetch_imeis)):?>
                      <tr>
                        <td>
                          <div class="form-group">
                            <input type="text" value="<?php echo $row['item_imei']; ?>" class="form-control imei-field"
                              name="imei_field[]" required>
                            <span class="help-block"></span>
                          </div>
                        </td>
                      </tr>
                      <?php endwhile; ?>
                    </tbody>
                  </table>
                  <p class="pull-left">
                    <b>Total items: </b> <span class="total_items">1</span>
                  </p>
                  <button class="btn btn-primary btn-lg booking-completed pull-right">Booking Completed</button>
                  <input type="submit" name="submit_btn" class="pull-right btn btn-lg btn-success submit-form">
                </div>
              </form>
              <!-- /.box-body -->
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</div>

</body>

<?php include $global_url."footer.php";?>
<script>
let t = $(".imei-field").length;
$(".total_items").html(t);
</script>

</html>