<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
  header("location:../index.php");
  exit;
}

mysqli_select_db($conn, 's4d_user_accounts');                    

$users = array();
$current_user_db = isset($_SESSION['user_db']) ? $_SESSION['user_db'] : '';

$list_stmt = mysqli_prepare(
  $conn,
  "SELECT user_id, user_name, user_phone, user_email, user_role
   FROM tbl_accounts
   WHERE user_password <> 'deleted' AND user_db = ?
   ORDER BY user_id ASC"
);
if ($list_stmt) {
  mysqli_stmt_bind_param($list_stmt, 's', $current_user_db);
  mysqli_stmt_execute($list_stmt);
  mysqli_stmt_bind_result($list_stmt, $user_id, $user_name, $user_phone, $user_email, $user_role);

  while (mysqli_stmt_fetch($list_stmt)) {
    $users[] = array(
      'user_id' => $user_id,
      'user_name' => $user_name,
      'user_phone' => $user_phone,
      'user_email' => $user_email,
      'user_role' => $user_role,
    );
  }

  mysqli_stmt_close($list_stmt);
}

// deleting NEW customer
if(isset($_GET['del'])){
  $del_user_id = filter_input(INPUT_GET, 'del', FILTER_VALIDATE_INT);
  if ($del_user_id === false || $del_user_id === null || (int)$del_user_id === (int)$_SESSION['user_id']) {
    mysqli_select_db($conn, $_SESSION['user_db']);                    
    header('location:manage_users.php');
    exit;
  }

  $delete_stmt = mysqli_prepare(
    $conn,
    "UPDATE tbl_accounts
     SET user_password = 'deleted'
     WHERE user_id = ? AND user_db = ? AND user_role <> 'admin'"
  );
  if ($delete_stmt) {
    mysqli_stmt_bind_param($delete_stmt, 'is', $del_user_id, $current_user_db);
    mysqli_stmt_execute($delete_stmt);
    mysqli_stmt_close($delete_stmt);
  }


  // INPUT LOG
  $log_stmt = mysqli_prepare($conn, "INSERT INTO tbl_log (ref, details) VALUES (?, ?)");
  if ($log_stmt) {
    $ref = (string)$del_user_id;
    $details = 'USER DELETED';
    mysqli_stmt_bind_param($log_stmt, 'ss', $ref, $details);
    mysqli_stmt_execute($log_stmt);
    mysqli_stmt_close($log_stmt);
  }

  // switch to user db before redirection 
  mysqli_select_db($conn, $_SESSION['user_db']);                    

  header('location:manage_users.php');
  exit;
}

mysqli_select_db($conn, $_SESSION['user_db']);                    


?>

<?php include "../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1 class="pull-left">
      Manage users
    </h1>
    <a href="new_user.php" class="pull-right">
      <button type="button" class="btn btn-block btn-success"><i class="fa fa-plus white"></i> New user</button>
    </a>

  </section>

  <!-- Main content -->
  <section class="content">
    <div class="row">

      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <div class="box">
                <!-- /.box-header -->
                <div class="box-body">
                  <table id="example1" class="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>user.ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Actions</th>
                      </tr>
	                    </thead>
	                    <tbody>
	                      <?php foreach ($users as $row):?>
	                      <tr>
	                        <td><?php echo $row['user_id'] ?></td>
	                        <td><?php echo $row['user_name'] ?>
	                          <small><b
	                              class="btn-sm text-green"><?php echo $_SESSION['user_id'] == $row['user_id'] ? '(Self)':''; ?></b></small>
                        </td>
                        <td><?php echo $row['user_phone'] ?></td>
                        <td><?php echo $row['user_email'] ?></td>
                        <td>
                          <div class="btn-group">
                            <a href="edit_user.php?edit=<?php echo $row['user_id']; ?>" class="btn btn-warning">Edit</a>
                            <?php if($row['user_role'] !== 'admin'): ?>
	                            <a href="manage_users.php?del=<?php echo $row['user_id']; ?>"
	                              class="btn <?php echo $delete_btn; ?> del_btn"><i class="fa fa-trash-bin"></i>Delete</a>
	                            <?php endif;?>
	                          </div>
	                        </td>
	                      </tr>
	                      <?php endforeach;?>
	                    </tbody>
	                  </table>
	                </div>
                <!-- /.box-body -->
              </div>
              <!-- /.box-body -->
            </div>
            <!-- /.box -->
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

<!-- page script -->
<script type="text/javascript">
$('.del_btn').on('click', function(e) {
  var userConfirm = confirm("Are you sure you want to Delete this user?");
  if (userConfirm == false) {
    e.preventDefault();
  }
});

$("#example1").DataTable();
</script>

</body>

</html>
