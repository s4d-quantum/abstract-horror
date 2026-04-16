<?php

// hide all errors and notices 
error_reporting(0);

session_start();
// ..logout
if(isset($_GET['logout'])){
  echo $_GET['logout'];
  unset($_SESSION['user_role']);
  session_destroy();
}
// ..redirect if not loggedin
if(!isset($_SESSION['user_role'])){
  header("location:../login.php");
}

if(isset($_SESSION['user_role'])){
  $role = $_SESSION['user_role'];
}

// hide delete btn when user is not admin
$delete_btn = $_SESSION['user_role'] == 'admin'? 'btn-danger':'hide';