<?php include '../db_config.php';  ?>
<?php $global_url="../"; ?>
<?php include  "../authenticate.php" ?>
<?php 

if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    header("location:../index.php");
    exit;
}

// select s4d_user_Accounts DB for all user accounts work
mysqli_select_db($conn, 's4d_user_accounts');                    

$new_user_id_query = mysqli_query($conn,"Select max(user_id) from tbl_accounts")
or die('Error:: ' . mysqli_error($conn));
$order_id_result = mysqli_fetch_assoc($new_user_id_query);
$new_user_id = ($order_id_result['max(user_id)']+1);


// INSERTING NEW CATEGORY
if(isset($_POST['submit_user']) && ($_POST['user_password1'] === $_POST['user_password2']) && $_POST['user_email'] ){
    // reselect user specific DB 
    mysqli_select_db($conn, $_SESSION['user_db']);                    

    // INPUT LOG
    $new_log_stmt = mysqli_prepare($conn, "INSERT INTO tbl_log (ref, details) VALUES (?, ?)");
    if ($new_log_stmt) {
      $ref = 'USR-' . $new_user_id;
      $details = 'NEW USER CREATED';
      mysqli_stmt_bind_param($new_log_stmt, 'ss', $ref, $details);
      mysqli_stmt_execute($new_log_stmt);
      mysqli_stmt_close($new_log_stmt);
    }

  if(isset($_POST['user_name'])){
    $today = date('Y-m-d');
    
    if(isset($_POST['user_is_admin']) && $_POST['user_is_admin'] === 'on'){
      $role = 'admin';
    }
    else{
      $role='user';
    }

    $passwordHash = password_hash($_POST['user_password1'], PASSWORD_DEFAULT);
    $user_name = trim($_POST['user_name']);
    $user_email = trim($_POST['user_email']);
    $user_phone = isset($_POST['user_phone']) ? trim($_POST['user_phone']) : '';
    
    // reselect user specific DB 
    mysqli_select_db($conn, 's4d_user_accounts');                    
    $insert_stmt = mysqli_prepare(
      $conn,
      "INSERT INTO tbl_accounts (
        user_id, user_name, user_email, user_password, user_phone, user_role, user_db
      ) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    if ($insert_stmt) {
      mysqli_stmt_bind_param(
        $insert_stmt,
        'issssss',
        $new_user_id,
        $user_name,
        $user_email,
        $passwordHash,
        $user_phone,
        $role,
        $_SESSION['user_db']
      );
      mysqli_stmt_execute($insert_stmt);
      mysqli_stmt_close($insert_stmt);
    }

    mysqli_select_db($conn, $_SESSION['user_db']);                    
      // REFRESH CURRENT PAGE
    header("location:manage_users.php");
    exit;
}
	else{
	  echo "user Name not provided!";
	}

  mysqli_select_db($conn, $_SESSION['user_db']);                    

  mysqli_close($conn);

}

?>

<?php include "../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      New User
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
                <div class="form-group col-md-5">
                  <label>Name</label>
                  <input type="text" class="form-control" name="user_name" required>
                </div>
                <div class="form-group col-md-4">
                  <label>Phone</label>
                  <input type="text" class="form-control" name="user_phone">
                </div>
              </div>

              <div class="row">
                <div class="form-group col-md-5">
                  <label>Email</label>
                  <input type="email" class="form-control" name="user_email">
                </div>
              </div>
              <div class="row">
                <div class="form-group col-md-5">
                  <label>Password</label>
                  <input type="password" class="form-control pass" name="user_password1">
                </div>
                <div class="form-group col-md-5">
                  <label>Retype Password</label>
                  <input type="password" class="form-control pass" name="user_password2">
                </div>
              </div>
              <div class="row">
                <div class="form-group col-md-2">
                  <label>
                    <input type="checkbox" name="user_is_admin">
                    <b>isAdmin?</b>
                  </label>
                </div>
              </div>
              
              <input type="submit" name="submit_user" value="Add user" class="btn btn-lg btn-success pull-right ">

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
