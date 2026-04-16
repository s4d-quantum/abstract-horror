<?php include '../../db_config.php';  ?>
<?php $global_url="../../"; ?>
<?php include "../../authenticate.php" ?>
<?php 

$query = mysqli_query($conn,"Select max(desc_id) from tbl_flash_descriptions");
$result = mysqli_fetch_assoc($query)['max(desc_id)']+1;
$date = date('Y-m-d');

// INSERTING NEW CATEGORY
if(isset($_POST['submit_flash'])){

  $user_id = $_SESSION['user_id'];
  $new_desc_id = $_POST['title'];


  $query = mysqli_query($conn,"insert into tbl_flash_descriptions 
  (desc_id,title) 
  values (".$result.",'".$_POST['title']."')")
    or die('Error:: '.mysqli_error($conn)); 

    // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
  date, user_id)
  values
  ('".$new_desc_id."','NEW FLASH DESCRIPTION',
  '".$date."','".$user_id."')")
  or die('Error:: ' . mysqli_error($conn));

  // REFRESH CURRENT PAGE
  header("location:manage_flash.php");
}

?>
<?php include "../../header.php";?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      New QC Description
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
                  <label>Desc ID</label>
                  <input type="text" class="form-control" disabled="" value="<?php echo $result; ?>">
                </div>
                <div class="form-group col-md-5">
                  <label>Title</label>
                  <input type="text" class="form-control" name="title" required>
                </div>
              </div>

              <input type="submit" name="submit_flash" value="Add Description"
                class="btn btn-lg btn-success pull-right">

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