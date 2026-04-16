<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

  // NEW PURCHASE ID
  $new_pur_id_query = mysqli_query($conn,"Select id, item_details from tbl_tac")
  or die('Error:: ' . mysqli_error($conn));

  if(isset($_POST['submit_trim'])){

    for($i = 0;$i<count($_POST['details']);$i++){
      $new_purchase = mysqli_query($conn,"update tbl_tac set 
      item_details='".trim($_POST['details'][$i])."' 
      where id=".$_POST['id'][$i])
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
    <section class="content">
      <div class="row">
        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">

              <form enctype="multipart/form-data" method="post" id="confirm_purchase" action="">

              <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Details</h3>
                  </div>
                  <table id="items_table" class="table table-bordered">
                      <tbody>
                      <tr>
                            <button class="btn btn-success" name="submit_trim" type="submit">Trim</button>
                        </tr>
                        <?php 
                          while($row = mysqli_fetch_assoc($new_pur_id_query)):
                        ?>
                        <tr>
                          <td class="row-id">
                            <input type="text" name="id[]" value="<?php echo $row['id'];?>" />  
                          </td>
                          <td class="row-id">
                            <input type="text" name="details[]" value="<?php echo $row['item_details'];?>" />  
                          </td>
                        </tr>
                        <?php endwhile;?>
                      </tbody>
                    </table>
                  </div>
                  <!-- /.box-body -->
                </div>
                <!-- /.box -->
                </form>
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
<script src="new_purchase_script.js"></script>
</body>
</html>