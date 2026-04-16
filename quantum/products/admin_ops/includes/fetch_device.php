<?php
include '../../../db_config.php';
include "../../../authenticate.php";

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode([
    'success' => false,
    'message' => 'Method not allowed.'
  ]);
  exit;
}

$imei = isset($_POST['item_imei']) ? trim($_POST['item_imei']) : '';

if ($imei === '' || !preg_match('/^[0-9]{14,17}$/', $imei)) {
  echo json_encode([
    'success' => false,
    'message' => 'Enter a valid IMEI.'
  ]);
  exit;
}

$stmt = mysqli_prepare(
  $conn,
  "
    SELECT
      im.item_imei,
      tc.item_details,
      COALESCE(cat.title, '') AS brand_title,
      im.item_grade AS grade,
      im.item_color,
      im.item_gb,
      pr.tray_id,
      COALESCE(t.locked, 0) AS tray_locked
    FROM tbl_imei im
    INNER JOIN tbl_tac tc ON tc.item_tac = im.item_tac
    INNER JOIN tbl_purchases pr ON pr.item_imei = im.item_imei
    LEFT JOIN tbl_trays t ON t.tray_id = pr.tray_id
    LEFT JOIN tbl_categories cat ON cat.category_id = tc.item_brand
    WHERE im.item_imei = ?
      AND im.status = 1
      AND pr.purchase_return = 0
    LIMIT 1
  "
);

mysqli_stmt_bind_param($stmt, 's', $imei);
mysqli_stmt_execute($stmt);
mysqli_stmt_bind_result(
  $stmt,
  $resImei,
  $itemDetails,
  $brandTitle,
  $grade,
  $color,
  $gb,
  $trayId,
  $trayLocked
);

if (mysqli_stmt_fetch($stmt)) {
  mysqli_stmt_close($stmt);

  $currentTrayLabel = $trayId !== null ? $trayId : '';
  if ($trayLocked) {
    $currentTrayLabel .= ' (Locked)';
  }

  echo json_encode([
    'success' => true,
    'device' => [
      'item_imei' => $resImei,
      'item_details' => $itemDetails,
      'brand' => $brandTitle,
      'grade' => $grade,
      'color' => $color,
      'gb' => $gb,
      'current_tray' => $currentTrayLabel
    ]
  ]);
  exit;
}

mysqli_stmt_close($stmt);

echo json_encode([
  'success' => false,
  'message' => 'Device not found, unavailable, or already allocated elsewhere.'
]);
exit;
