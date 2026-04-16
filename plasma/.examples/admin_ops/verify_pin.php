<?php
include '../../db_config.php';
include "../../authenticate.php";

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
  ]);
  exit;
}

$pin = isset($_POST['pin']) ? trim($_POST['pin']) : '';
$operation = isset($_POST['operation']) ? trim($_POST['operation']) : '';
$reason = isset($_POST['reason']) ? trim($_POST['reason']) : '';

if ($operation === '') {
  echo json_encode([
    'success' => false,
    'message' => 'Operation is required.'
  ]);
  exit;
}

$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
if (!$userId) {
  http_response_code(401);
  echo json_encode([
    'success' => false,
    'message' => 'User session not found.'
  ]);
  exit;
}

$expectedPin = isset($_ENV['ADMIN_OPS_PIN']) ? trim($_ENV['ADMIN_OPS_PIN']) : '';
if ($expectedPin === '') {
  echo json_encode([
    'success' => false,
    'message' => 'Admin Ops PIN has not been configured.'
  ]);
  exit;
}

if ($pin === '') {
  echo json_encode([
    'success' => false,
    'message' => 'PIN code is required.'
  ]);
  exit;
}

if (!hash_equals($expectedPin, $pin)) {
  http_response_code(403);
  echo json_encode([
    'success' => false,
    'message' => 'Invalid PIN code.'
  ]);
  exit;
}

$redirect = '';
$logOperationImmediately = true;

switch ($operation) {
  case 'Location Management':
    if ($reason === '') {
      echo json_encode([
        'success' => false,
        'message' => 'Reason is required for Location Management.'
      ]);
      exit;
    }
    $redirect = 'location_management.php?' . http_build_query(['reason' => $reason]);
    $logOperationImmediately = false;
    break;
  case 'Color Check':
    $reason = 'color check';
    $redirect = 'color_check.php';
    break;
  case 'Label Print':
    $reason = 'label printing';
    $redirect = 'label_print.php';
    break;
  default:
    echo json_encode([
      'success' => false,
      'message' => 'Unknown operation requested.'
    ]);
    exit;
}

if (!$logOperationImmediately) {
  echo json_encode([
    'success' => true,
    'redirect' => $redirect
  ]);
  exit;
}

$insertSql = "INSERT INTO tbl_adminops (user_id, operation, reason) VALUES (?, ?, ?)";
$stmt = mysqli_prepare($conn, $insertSql);

if (!$stmt) {
  echo json_encode([
    'success' => false,
    'message' => 'Unable to record admin operation.'
  ]);
  exit;
}

mysqli_stmt_bind_param($stmt, 'sss', $userId, $operation, $reason);

if (!mysqli_stmt_execute($stmt)) {
  mysqli_stmt_close($stmt);
  echo json_encode([
    'success' => false,
    'message' => 'Failed to save admin operation.'
  ]);
  exit;
}

$adminOpId = mysqli_insert_id($conn);
mysqli_stmt_close($stmt);

echo json_encode([
  'success' => true,
  'redirect' => $redirect,
  'adminOpId' => $adminOpId
]);
exit;
