<?php 
// ..logout
function logout(){
  global $conn;
  if(isset($_GET['logout'])){
    $date = date('Y-m-d');

    // user log out (best-effort log write)
    if (isset($_SESSION['user_id'])) {
      $stmt = mysqli_prepare($conn, "INSERT INTO tbl_log (user_id, date, subject) VALUES (?, ?, ?)");
      if ($stmt) {
        $user_id_int = (int)$_SESSION['user_id'];
        $subject = 'USER LOGOUT';
        mysqli_stmt_bind_param($stmt, 'iss', $user_id_int, $date, $subject);
        mysqli_stmt_execute($stmt);
        mysqli_stmt_close($stmt);
      }
    }

    unset($_SESSION['user_role']);
    unset($_SESSION['user_id']);
    unset($_SESSION['user_name']);
    unset($_SESSION['user_email']);
    unset($_SESSION['user_db']);
    session_destroy();
  }
}
