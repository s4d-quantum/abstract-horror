<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

$query = mysqli_query($conn,"Select max(id) from tbl_trays");
$result = mysqli_fetch_assoc($query);
$date = date('Y-m-d');

// DISPLAYING CATEGORY ID
// if($result['max(id)'] / 100 > 1){
//     $new_tray_id = 'TR'.($result['max(id)']+1);
// }
// else if($result['max(id)'] / 10 > 1){
//     $new_tray_id = 'TR0'.($result['max(id)']+1);
// }
// else{
//     $new_tray_id = 'TR00'.($result['max(id)']+1);
// }

// INSERTING NEW CATEGORY
if(isset($_POST['submit_tray'])){

  $user_id = $_SESSION['user_id'];
  $new_tray_id = trim($_POST['tray_title']);


  $query = mysqli_query($conn,"insert into tbl_trays 
  (tray_id,title) 
  values ('".trim($_POST['tray_title'])."','".trim($_POST['tray_title'])."')")
    or die('Error:: '.mysqli_error($conn)); 

    // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
  date, user_id)
  values
  ('".$new_tray_id."','NEW TRAY',
  '".$date."','".$user_id."')")
  or die('Error:: ' . mysqli_error($conn));

  // REFRESH CURRENT PAGE
  header("location:manage_trays.php");
}

?>
<?php include "../../header.php";?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      New tray
    </h1>
  </section>

  <!-- Main content -->
  <section class="content">

    <!-- form started -->
    <form action="<?php echo $_SERVER["PHP_SELF"];?>" method="post">

      <!-- row  -->
      <div class="row">
        <!-- col -->
        <div class="col-md-10">
          <!-- box started-->
          <div class="box box-success">
            <div class="box-body">
              <div class="row">
                <div class="form-group col-md-2">
                  <label>Tray ID</label>
                  <input type="text" class="form-control" disabled="" value="<?php echo $result['max(id)']+1; ?>">
                </div>
                <div class="form-group col-md-5">
                  <label>Tray Title</label>
                  <input type="text" class="form-control" name="tray_title" required>
                </div>
              </div>

              <input type="submit" name="submit_tray" value="Add tray" class="btn btn-lg btn-success pull-right">

            </div>
            <!-- /.box-body -->
          </div>
          <!-- /.box -->
        </div>
        <!-- col -->

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