<?php
session_start();

// Load environment variables
require_once __DIR__ . '/vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$currentDB = isset($_SESSION['user_db']) ? $_SESSION['user_db'] : 's4d_user_accounts';

// Use environment variables for database connection
$host = $_ENV['DB_HOST'];
$username = $_ENV['DB_USERNAME'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_DATABASE'] ?? $currentDB;

$conn = mysqli_connect($host, $username, $password);
$query = mysqli_select_db($conn, $currentDB);

// check if user is in index page and selected DB is s4d_user_accounts then redirects to login  page
if(strpos($_SERVER['REQUEST_URI'],'localhost://s4dlimited/index.php') && $currentDB === 's4d_user_accounts'){
  header("location:login.php");
}

if (mysqli_connect_errno()){
  echo "<script>alert('Failed to connect to MySQL: " . mysqli_connect_error()."');</script>";
}
