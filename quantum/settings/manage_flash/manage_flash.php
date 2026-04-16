<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 
  $date = date('Y-m-d');

$query1 = mysqli_query($conn,"Select * from tbl_flash_descriptions")
 or die('Error:: '.mysqli_error($conn)); 

//  DELETING TRAY
if(isset($_GET['del'])){
  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  $delete_flash = mysqli_query($conn,"delete from tbl_flash_descriptions where desc_id='".$_GET['del']."'")
  or die('Error:: '.mysqli_error($conn)); 

  // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (
  ref,
  subject,
  date, 
  user_id)
  values
  (
    '".$_GET['del']."',
    'DELETE FLASH DESCRIPTION',
    '".$date."',
    '".$user_id."'
    )")
  or die('Error:: ' . mysqli_error($conn));


  header('location:manage_flash.php');
}

?>

<?php include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <form action="<?php echo $_SERVER["PHP_SELF"];?>" method="post">

        <!-- Main content -->
        <div class="col-xs-12">
          <section class="content">
            <div class="row">
              <div class="col-xs-12">
                <div class="box">
                  <div class="box-header">
                    <div class="box-title">Manage Descriptions</div>
                    <a href="new_flash.php" class="btn btn-success pull-right">
                      <i class="fa fa-plus"></i> New QC Description</a>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>S.No</th>
                          <th>Title</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php 
                        $i = 0;
                        while($row = mysqli_fetch_array($query1)):?>
                        <tr>
                          <td><?php echo ++$i; ?></td>
                          <td><?php echo $row['title'] ?></td>
                          <td>
                            <div class="btn-group">
                              <?php 
//                              Prevent descriptions of 'Yes' and 'NO' to be editable 
  //                            so that all previous flash descriptions remain untouched
                              if($row['desc_id'] > 1):
                            ?>
                              <a href="edit_flash.php?desc_id=<?php echo $row['desc_id']; ?>">
                                <button type="button" class="btn btn-warning"><i class="fa fa-pencil"
                                    name="edit_customer"></i></button>
                              </a>
                              <a href="?del=<?php echo $row['desc_id']; ?>">
                                <button type="button" name="del_flash"
                                  class="del_flash btn <?php echo $delete_btn; ?>"><i class="fa fa-times"></i></button>
                              </a>
                              <?php endif; ?>
                            </div>
                          </td>
                        </tr>
                        <?php endwhile;?>
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
      </form>
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->


<?php include $global_url."footer.php";?>
<!-- <script>

  let tray = document.getElementsByClassName('del_flash')[0];
  tray.addEventListener('click',function(e){
    e.preventDefault();
  })
</script> -->

</body>

</html>