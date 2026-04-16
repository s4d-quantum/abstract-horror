<?php $global_url="../"; ?>
<?php include '../db_config.php';  ?>
<?php include "../authenticate.php" ?>
<?php 
  $date = date('Y-m-d');

$query1 = mysqli_query($conn,"Select * from tbl_grades")
 or die('Error:: '.mysqli_error($conn)); 

//  DELETING grade
if(isset($_GET['del'])){
  $user_id = $_SESSION['user_id'];

  $delete_grade = mysqli_query($conn,"delete from tbl_grades where grade_id='".$_GET['del']."'")
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
    'DELETE GRADE',
    '".$date."',
    '".$user_id."'
    )")
  or die('Error:: ' . mysqli_error($conn));


  header('location:manage_grades.php');
}

?>

<?php include "../header.php";
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
                    <div class="box-title">Manage Grades</div>
                    <a href="new_grade.php" class="btn btn-success pull-right">
                      <i class="fa fa-plus"></i> New Grade</a>
                  </div>
                  <!-- /.box-header -->
                  <div class="box-body">
                    <table id="example1" class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php while($row = mysqli_fetch_array($query1)):?>
                        <tr>
                          <td><?php echo $row['grade_id'] ?></td>
                          <td><?php echo $row['title'] ?></td>
                          <td>
                            <div class="btn-group">
                              <a href="edit_grade.php?grade_id=<?php echo $row['grade_id']; ?>">
                                <button type="button" class="btn btn-warning"><i class="fa fa-pencil"></i></button>
                              </a>
                              <a href="?del=<?php echo $row['grade_id']; ?>">
                                <button type="button" name="del_grade"
                                  class="del_grade btn <?php echo $delete_btn; ?>"><i class="fa fa-times"></i></button>
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
<!-- <script>

  let grade = document.getElementsByClassName('del_grade')[0];
  grade.addEventListener('click',function(e){
    e.preventDefault();
  })
</script> -->

</body>

</html>