<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Load environment variables
require_once __DIR__ . '/../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->safeLoad();

$currentDB = isset($_SESSION['user_db']) ? $_SESSION['user_db'] : 's4d_user_accounts';

// Use environment variables for database connection
$host = $_ENV['DB_HOST'];
$username = $_ENV['DB_USERNAME'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_DATABASE'] ?? $currentDB;

$conn = mysqli_connect($host, $username, $password);
mysqli_select_db($conn, $currentDB);

// Optional: redirect if not logged in
if (strpos($_SERVER['REQUEST_URI'], 'index.php') && $currentDB === 's4d_user_accounts') {
  header("Location: login.php");
}

if (mysqli_connect_errno()) {
  echo "<script>alert('Failed to connect to MySQL: " . mysqli_connect_error() . "');</script>";
}