<?php
include '../db_config.php';  



$success = null;
$error = null;

header('Content-Type: application/json; charset=UTF-8');

$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$password = isset($_POST['password']) ? $_POST['password'] : '';

if ($email === '' || $password === '') {
  $error = 'Invalid credentials. Please try again.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  $error = 'Invalid credentials. Please try again.';
} else {
  mysqli_select_db($conn, 's4d_user_accounts');

  $stmt = mysqli_prepare(
    $conn,
    "SELECT user_id, user_name, user_role, user_password, user_db
     FROM tbl_accounts
     WHERE user_email = ?
     LIMIT 1"
  );

  if (!$stmt) {
    $error = 'Login temporarily unavailable. Please try again.';
  } else {
    mysqli_stmt_bind_param($stmt, 's', $email);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_bind_result($stmt, $user_id, $user_name, $user_role, $stored_password, $user_db);

    if (mysqli_stmt_fetch($stmt)) {
      if (password_verify($password, $stored_password) && !empty($user_db)) {
        session_regenerate_id(true);

        $_SESSION['user_id'] = $user_id;
        $_SESSION['user_name'] = $user_name;
        $_SESSION['user_role'] = $user_role;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_db'] = $user_db;

        // Log the user in (best-effort)
        $date = date('Y-m-d H:i:s');
        $subject = 'USER LOGIN';
        $log_stmt = mysqli_prepare(
          $conn,
          "INSERT INTO tbl_log (user_id, date, subject) VALUES (?, ?, ?)"
        );
        if ($log_stmt) {
          $user_id_int = (int)$user_id;
          mysqli_stmt_bind_param($log_stmt, 'iss', $user_id_int, $date, $subject);
          mysqli_stmt_execute($log_stmt);
          mysqli_stmt_close($log_stmt);
        }

        // switch DB
        mysqli_select_db($conn, $user_db);

        $success = (string)$user_id;
      } else {
        $error = 'Invalid credentials. Please try again.';
      }
    } else {
      $error = 'Either Email or Password are wrong! Please try again.';
    }

    mysqli_stmt_close($stmt);
  }
}

print json_encode(array("user_id"=>$success, "error"=>$error,));
