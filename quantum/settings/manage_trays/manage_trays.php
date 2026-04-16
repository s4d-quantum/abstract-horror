<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

$query1 = mysqli_query($conn,"Select * from tbl_trays")
 or die('Error:: '.mysqli_error($conn)); 

//  DELETING TRAY
if(isset($_GET['del'])){
  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  $delete_tray = mysqli_query($conn,"delete from tbl_trays where tray_id='".$_GET['del']."'")
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
    'DELETE TRAY',
    '".$date."',
    '".$user_id."'
    )")
  or die('Error:: ' . mysqli_error($conn));


  header('location:manage_trays.php');
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
                    <div class="box-title">Manage trays</div>
                    <a href="new_tray.php" class="btn btn-success pull-right">
                      <i class="fa fa-plus"></i> New Tray</a>
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
                          <td><?php echo $row['tray_id'] ?></td>
                          <td>
                            <div class="btn-group">
                              <a href="edit_tray.php?tray_id=<?php echo $row['tray_id']; ?>">
                                <button type="button" class="btn btn-warning"><i class="fa fa-pencil"
                                    name="edit_customer"></i></button>
                              </a>
                              <a href="?del=<?php echo $row['tray_id']; ?>">
                                <button type="button" name="del_tray" class="del_tray btn <?php echo $delete_btn; ?>"><i
                                    class="fa fa-times"></i></button>
                              </a>
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
<script>
$('#example1').dataTable();

//  let tray = document.getElementsByClassName('del_tray')[0];
//   tray.addEventListener('click',function(e){
//     e.preventDefault();
//   }) 
</script>

</body>

</html>