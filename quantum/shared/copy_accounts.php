<!-- copy all accounts from master to company specific DBs
 -->

<?php

// Load environment variables
require_once __DIR__ . '/../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

include "config.php";

// Use environment variables for database connection
$host = $_ENV['DB_HOST'];
$username = $_ENV['DB_USERNAME'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_DATABASE_COMPANIES'];

$conn = mysqli_connect($host, $username, $password);
mysqli_select_db($conn, $database);


// fetch all associated accounts 
$fetch_accounts_query = mysqli_query($conn, "SELECT * FROM tbl_accounts WHERE company_id=".$client_company_id)
    or die('Error: ' . mysqli_error($conn));

$results_array = array();
while ($row = mysqli_fetch_assoc($fetch_accounts_query)) {
    $results_array[] = $row;
}

// switch back to company specific db 
mysqli_select_db($conn, $_SESSION['db_name']);

mysqli_begin_transaction($conn);

foreach ($results_array as $account) {
    $user_id = mysqli_real_escape_string($conn, $account['user_id']);
    $user_name = mysqli_real_escape_string($conn, $account['user_name']);
    $user_email = mysqli_real_escape_string($conn, $account['user_email']);
    $user_password = mysqli_real_escape_string($conn, $account['user_password']);
    $user_phone = mysqli_real_escape_string($conn, $account['user_phone']);
    $user_role = mysqli_real_escape_string($conn, $account['user_role']);
  
  $upsert_query = "INSERT ignore INTO tbl_accounts (user_id, user_name, user_email, user_password, user_phone, user_role)
      VALUES ('$user_id', '$user_name', '$user_email', '$user_password', '$user_phone', '$user_role')
    --   ON DUPLICATE KEY UPDATE
    --   user_name = '$user_name',
    --   user_email = '$user_email',
    --   user_password = '$user_password',
    --   user_phone = '$user_phone',
    --   user_role = '$user_role'
    ";
      
  mysqli_query($conn, $upsert_query)
      or die('Error: ' . mysqli_error($conn));
}

mysqli_commit($conn);