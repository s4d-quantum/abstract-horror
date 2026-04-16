<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include "../authenticate.php" ?>
<?php 

if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
  header("location:../index.php");
  exit;
}

mysqli_select_db($conn, 's4d_user_accounts');                    

// DISPLAYING CATEGORY ID
$new_user_id = filter_input(INPUT_GET, 'edit', FILTER_VALIDATE_INT);
if ($new_user_id === false || $new_user_id === null) {
  mysqli_select_db($conn, $_SESSION['user_db']);                    
  header("location:manage_users.php");
  exit;
}

$result = array();
$fetch_stmt = mysqli_prepare(
  $conn,
  "SELECT user_id, user_name, user_phone, user_email, user_role
   FROM tbl_accounts
   WHERE user_id = ?
   LIMIT 1"
);
if ($fetch_stmt) {
  mysqli_stmt_bind_param($fetch_stmt, 'i', $new_user_id);
  mysqli_stmt_execute($fetch_stmt);
  mysqli_stmt_bind_result($fetch_stmt, $user_id, $user_name, $user_phone, $user_email, $user_role);
  if (mysqli_stmt_fetch($fetch_stmt)) {
    $result = array(
      'user_id' => $user_id,
      'user_name' => $user_name,
      'user_phone' => $user_phone,
      'user_email' => $user_email,
      'user_role' => $user_role,
    );
  }
  mysqli_stmt_close($fetch_stmt);
}

if (empty($result)) {
  mysqli_select_db($conn, $_SESSION['user_db']);                    
  header("location:manage_users.php");
  exit;
}

// INSERTING NEW CATEGORY
if(isset($_POST['submit_customer'])){
  
  if(isset($_POST['user_is_admin']) && $_POST['user_is_admin'] === 'on'){
    $role = 'admin';
  }
  else{
    $role='user';
  }
  
  $user_email = isset($_POST['user_email']) ? trim($_POST['user_email']) : '';
  $user_phone = isset($_POST['user_phone']) ? trim($_POST['user_phone']) : '';
  $user_name = isset($_POST['user_name']) ? trim($_POST['user_name']) : '';
  $new_password = isset($_POST['user_password']) ? $_POST['user_password'] : '';

  if ($new_password !== '') {
    $passwordHash = password_hash($new_password, PASSWORD_DEFAULT);
    $update_stmt = mysqli_prepare(
      $conn,
      "UPDATE tbl_accounts
       SET user_email = ?, user_password = ?, user_phone = ?, user_name = ?, user_role = ?
       WHERE user_id = ?"
    );
    if ($update_stmt) {
      mysqli_stmt_bind_param($update_stmt, 'sssssi', $user_email, $passwordHash, $user_phone, $user_name, $role, $new_user_id);
      mysqli_stmt_execute($update_stmt);
      mysqli_stmt_close($update_stmt);
    }
  } else {
    $update_stmt = mysqli_prepare(
      $conn,
      "UPDATE tbl_accounts
       SET user_email = ?, user_phone = ?, user_name = ?, user_role = ?
       WHERE user_id = ?"
    );
    if ($update_stmt) {
      mysqli_stmt_bind_param($update_stmt, 'ssssi', $user_email, $user_phone, $user_name, $role, $new_user_id);
      mysqli_stmt_execute($update_stmt);
      mysqli_stmt_close($update_stmt);
    }
  }

    // switch to user db before redirection 
    mysqli_select_db($conn, $_SESSION['user_db']);                    

    header("location:manage_users.php");  
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
    <h1>
      Edit user
    </h1>
  </section>

  <!-- Main content -->
  <section class="content">

    <!-- form started -->
    <form enctype="multipart/form-data" action="" method="post">

      <!-- row  -->
      <div class="row">
        <!-- col -->
        <div class="col-md-10">
          <!-- box started-->
          <div class="box box-success">
            <div class="box-body">
              <div class="row">
                <div class="form-group col-md-5">
                  <label>Name</label>
                  <input type="text" class="form-control" name="user_name" value="<?php echo $result['user_name']; ?>"
                    required>
                </div>
                <div class="form-group col-md-4">
                  <label>Phone</label>
                  <input type="text" class="form-control" name="user_phone"
                    value="<?php echo $result['user_phone']; ?>">
                </div>
              </div>

              <div class="row">
                <hr>
                <div class="form-group col-md-5">
                  <label>Email</label>
                  <input type="email" class="form-control" name="user_email"
                    value="<?php echo $result['user_email']; ?>">
                </div>
                <div class="form-group col-md-5">
                  <label>New Password?</label>
                  <input type="text" class="form-control" name="user_password" placeholder="Change password?">
                </div>
                <div class="form-group col-md-5">
                  <label>
                    <input type="checkbox" name="user_is_admin"
                      <?php echo ($result['user_role'] == 'admin')? 'checked':''; ?>>
                    is Admin?
                  </label>
                </div>
              </div>

              <input type="submit" name="submit_customer" value="Save user" class="btn btn-lg btn-success pull-right">

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
