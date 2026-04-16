<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

$new_grade_id = $_GET['grade_id'];

$find_data_query = mysqli_query($conn,"select * from tbl_grades where 
    grade_id='".$new_grade_id."'")
    or die('Error:: '.mysqli_error($conn)); 
$find_data = mysqli_fetch_assoc($find_data_query);

// INSERTING NEW CATEGORY
if(isset($_POST['submit_grade'])){

  $user_id = $_SESSION['user_id'];
  $date = date('Y-m-d');

  $query = mysqli_query($conn,"update tbl_grades 
  set title ='".$_POST['grade_title']."' where 
  grade_id='".$new_grade_id."'")
  or die('Error:: '.mysqli_error($conn)); 

  // INPUT LOG
  $new_log = mysqli_query($conn,"insert into tbl_log (ref,subject,
  date, user_id)
  values
  ('".$new_grade_id."','UPDATE grade',
  '".$date."','".$user_id."')")
  or die('Error:: ' . mysqli_error($conn));

  // REFRESH CURRENT PAGE
  header("location:manage_grades.php");
}

?>
<?php include "../header.php";?>

  <!-- Content Wrapper. Contains page content -->
  <div class="content-wrapper">
    <!-- Content Header (Page header) -->
      <section class="content-header">
        <h1>
            Edit grade
        </h1>
    </section>

    <!-- Main content -->
    <section class="content">

      <!-- form started -->
      <form action="" method="post">

      <!-- row  -->
      <div class="row">
      <!-- col -->
        <div class="col-md-10">
        <!-- box started-->
          <div class="box box-success">
            <div class="box-body">
              <div class="row"> 
                <div class="form-group col-md-2">
                  <label>Grade ID</label>
                  <input type="text" class="form-control" disabled="" value="<?php echo $new_grade_id; ?>">
                </div>
                <div class="form-group col-md-5">
                    <label>Title</label>
                    <input type="text" class="form-control" value="<?php echo $find_data['title']; ?>" 
                    name="grade_title" required>
                </div>
              </div>

              <input type="submit" name="submit_grade" value="Add grade" class="btn btn-lg btn-success pull-right">

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
 