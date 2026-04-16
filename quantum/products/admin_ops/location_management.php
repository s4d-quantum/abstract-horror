<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php"; ?>
<?php $global_url = "../../"; ?>

<?php
$errors = [];
$reasonValue = isset($_GET['reason']) ? trim($_GET['reason']) : '';
$operationDateValue = date('Y-m-d');
$selectedTray = '';
$existingItems = [];

$trayIndex = [];
$traysResult = mysqli_query($conn, "SELECT tray_id, COALESCE(locked, 0) AS locked FROM tbl_trays ORDER BY tray_id");
if ($traysResult) {
  while ($trayRow = mysqli_fetch_assoc($traysResult)) {
    $trayIndex[$trayRow['tray_id']] = $trayRow;
  }
  mysqli_free_result($traysResult);
}

$postedImeis = isset($_POST['item_imei']) && is_array($_POST['item_imei']) ? $_POST['item_imei'] : [];
$postedDetails = isset($_POST['item_details']) && is_array($_POST['item_details']) ? $_POST['item_details'] : [];
$postedBrand = isset($_POST['item_brand']) && is_array($_POST['item_brand']) ? $_POST['item_brand'] : [];
$postedGrade = isset($_POST['item_grade']) && is_array($_POST['item_grade']) ? $_POST['item_grade'] : [];
$postedColor = isset($_POST['item_color']) && is_array($_POST['item_color']) ? $_POST['item_color'] : [];
$postedGb = isset($_POST['item_gb']) && is_array($_POST['item_gb']) ? $_POST['item_gb'] : [];
$postedCurrentTray = isset($_POST['current_tray']) && is_array($_POST['current_tray']) ? $_POST['current_tray'] : [];

foreach ($postedImeis as $idx => $imeiValue) {
  $existingItems[] = [
    'item_imei' => trim($imeiValue),
    'item_details' => isset($postedDetails[$idx]) ? $postedDetails[$idx] : '',
    'item_brand' => isset($postedBrand[$idx]) ? $postedBrand[$idx] : '',
    'item_grade' => isset($postedGrade[$idx]) ? $postedGrade[$idx] : '',
    'item_color' => isset($postedColor[$idx]) ? $postedColor[$idx] : '',
    'item_gb' => isset($postedGb[$idx]) ? $postedGb[$idx] : '',
    'current_tray' => isset($postedCurrentTray[$idx]) ? $postedCurrentTray[$idx] : '',
  ];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['move_stock'])) {
  $operationDateValue = isset($_POST['operation_date']) && $_POST['operation_date'] !== '' ? $_POST['operation_date'] : $operationDateValue;
  $reasonValue = isset($_POST['reason']) ? trim($_POST['reason']) : $reasonValue;
  $selectedTray = isset($_POST['new_tray']) ? trim($_POST['new_tray']) : '';

  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $operationDateValue)) {
    $errors[] = 'Invalid date selected.';
  }

  if ($reasonValue === '') {
    $errors[] = 'Reason is required.';
  }

  if ($selectedTray === '') {
    $errors[] = 'Select a new location.';
  } elseif (!isset($trayIndex[$selectedTray])) {
    $errors[] = 'Selected location is invalid.';
  } elseif ((int)$trayIndex[$selectedTray]['locked'] === 1) {
    $errors[] = 'Selected location is locked. Please unlock it before moving stock.';
  }

  $distinctImeis = [];
  foreach ($existingItems as $item) {
    if ($item['item_imei'] === '') {
      continue;
    }

    if (!preg_match('/^[0-9]{14,17}$/', $item['item_imei'])) {
      $errors[] = 'Invalid IMEI format detected: ' . htmlspecialchars($item['item_imei']);
      continue;
    }

    if (isset($distinctImeis[$item['item_imei']])) {
      $errors[] = 'Duplicate IMEI detected: ' . htmlspecialchars($item['item_imei']);
      continue;
    }

    $distinctImeis[$item['item_imei']] = true;
  }

  if (empty($distinctImeis)) {
    $errors[] = 'Add at least one device to move.';
  }

  $deviceMoves = [];
  if (empty($errors)) {
    foreach (array_keys($distinctImeis) as $imei) {
      $escapedImei = mysqli_real_escape_string($conn, $imei);
      $deviceQuery = mysqli_query(
        $conn,
        "
          SELECT
            pr.tray_id AS current_tray,
            COALESCE(t.locked, 0) AS tray_locked,
            im.status,
            pr.purchase_return
          FROM tbl_purchases pr
          INNER JOIN tbl_imei im ON im.item_imei = pr.item_imei
          LEFT JOIN tbl_trays t ON t.tray_id = pr.tray_id
          WHERE pr.item_imei = '{$escapedImei}'
            AND pr.purchase_return = 0
            AND im.status = 1
          LIMIT 1
        "
      );

      if ($deviceQuery && mysqli_num_rows($deviceQuery) === 1) {
        $deviceRow = mysqli_fetch_assoc($deviceQuery);
        mysqli_free_result($deviceQuery);

        if ($deviceRow['current_tray'] === $selectedTray) {
          $errors[] = 'Device ' . htmlspecialchars($imei) . ' is already located in tray ' . htmlspecialchars($selectedTray) . '.';
          continue;
        }

        $deviceMoves[] = [
          'item_imei' => $imei,
          'old_tray' => $deviceRow['current_tray'],
        ];
      } else {
        if ($deviceQuery) {
          mysqli_free_result($deviceQuery);
        }
        $errors[] = 'Unable to locate available stock for IMEI ' . htmlspecialchars($imei) . '.';
      }
    }
  }

  if (empty($errors) && !empty($deviceMoves)) {
    mysqli_begin_transaction($conn);

    $transactionError = false;
    $adminOpStmt = mysqli_prepare(
      $conn,
      "INSERT INTO tbl_adminops (date, time, user_id, operation, reason) VALUES (?, CURTIME(), ?, ?, ?)"
    );

    if (!$adminOpStmt) {
      $transactionError = true;
    } else {
      $operationName = 'Location Management';
      $operationDateForDb = $operationDateValue;
      $userId = isset($_SESSION['user_id']) ? (string)$_SESSION['user_id'] : '';

      mysqli_stmt_bind_param($adminOpStmt, 'ssss', $operationDateForDb, $userId, $operationName, $reasonValue);

      if (!mysqli_stmt_execute($adminOpStmt)) {
        $transactionError = true;
      } else {
        $adminOpId = mysqli_insert_id($conn);

        $updateStmt = mysqli_prepare($conn, "UPDATE tbl_purchases SET tray_id = ? WHERE item_imei = ?");
        $logStmt = mysqli_prepare(
          $conn,
          "INSERT INTO tbl_adminops_devices (adminop_id, item_imei, old_tray_id, new_tray_id) VALUES (?, ?, ?, ?)"
        );

        if (!$updateStmt || !$logStmt) {
          $transactionError = true;
        } else {
          $newTrayParam = $selectedTray;
          $imeiParamUpdate = '';
          mysqli_stmt_bind_param($updateStmt, 'ss', $newTrayParam, $imeiParamUpdate);

          $adminOpIdParam = $adminOpId;
          $imeiParamLog = '';
          $oldTrayParam = '';
          $newTrayParamLog = $selectedTray;
          mysqli_stmt_bind_param($logStmt, 'isss', $adminOpIdParam, $imeiParamLog, $oldTrayParam, $newTrayParamLog);

          foreach ($deviceMoves as $move) {
            $imeiParamUpdate = $move['item_imei'];
            if (!mysqli_stmt_execute($updateStmt) || mysqli_stmt_affected_rows($updateStmt) === 0) {
              $transactionError = true;
              break;
            }

            $imeiParamLog = $move['item_imei'];
            $oldTrayParam = $move['old_tray'] !== null ? $move['old_tray'] : '';
            if (!mysqli_stmt_execute($logStmt)) {
              $transactionError = true;
              break;
            }
          }
        }
      }
    }

    if ($transactionError) {
      mysqli_rollback($conn);
      $errors[] = 'Unable to complete the move. Please try again.';
    } else {
      // Add logging to tbl_log for each device moved
      $logStmtTblLog = mysqli_prepare(
        $conn,
        "INSERT INTO tbl_log (date, ref, item_code, subject, details) VALUES (CURDATE(), ?, ?, 'Stock Moved', ?)"
      );
      
      if ($logStmtTblLog) {
        $refParam = $adminOpId; // adminops_id as ref
        $itemCodeParam = '';
        $detailsParam = ''; // old_tray_id and new_tray_id as details
        mysqli_stmt_bind_param($logStmtTblLog, 'sss', $refParam, $itemCodeParam, $detailsParam);
        
        foreach ($deviceMoves as $move) {
          $itemCodeParam = $move['item_imei']; // item_imei/imei number
          $detailsParam = $move['old_tray'] . ' to ' . $selectedTray; // old_tray_id and new_tray_id
          mysqli_stmt_execute($logStmtTblLog);
        }
        
        mysqli_stmt_close($logStmtTblLog);
      }
      
      mysqli_commit($conn);
      header("Location: admin_ops_detail.php?id=" . $adminOpId);
      exit;
    }

    if (isset($adminOpStmt) && $adminOpStmt) {
      mysqli_stmt_close($adminOpStmt);
    }
    if (isset($updateStmt) && $updateStmt) {
      mysqli_stmt_close($updateStmt);
    }
    if (isset($logStmt) && $logStmt) {
      mysqli_stmt_close($logStmt);
    }
  } elseif (empty($errors)) {
    $errors[] = 'Add at least one device to move.';
  }
}
?>
<?php include "../../header.php"; ?>

<div class="content-wrapper">
  <section class="content-header">
    <h1>Location Management</h1>
  </section>
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <?php if (!empty($errors)): ?>
                <div class="alert alert-danger">
                  <ul style="margin-bottom:0;">
                    <?php foreach ($errors as $error): ?>
                      <li><?php echo $error; ?></li>
                    <?php endforeach; ?>
                  </ul>
                </div>
              <?php endif; ?>

              <form method="post" id="location-management-form">
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Operation Details</h3>
                  </div>
                  <div class="box-body">
                    <div class="row">
                      <div class="form-group col-sm-4">
                        <label for="operation_date">Date</label>
                        <input type="date"
                               id="operation_date"
                               name="operation_date"
                               class="form-control"
                               value="<?php echo htmlspecialchars($operationDateValue); ?>"
                               required>
                      </div>
                      <div class="form-group col-sm-4">
                        <label for="operation_reason">Reason</label>
                        <input type="text"
                               id="operation_reason"
                               name="reason"
                               class="form-control"
                               value="<?php echo htmlspecialchars($reasonValue); ?>"
                               required>
                        <p class="help-block">Update if the reason entered on unlock needs correcting.</p>
                      </div>
                      <div class="form-group col-sm-4">
                        <label for="new_tray">New Location</label>
                        <select id="new_tray" name="new_tray" class="form-control" required>
                          <option value="">Select tray</option>
                          <?php foreach ($trayIndex as $trayId => $trayData): ?>
                            <option value="<?php echo htmlspecialchars($trayId); ?>"
                              <?php echo $selectedTray === $trayId ? 'selected' : ''; ?>
                              <?php echo ((int)$trayData['locked'] === 1) ? 'disabled' : ''; ?>>
                              <?php echo htmlspecialchars($trayId); ?>
                              <?php echo ((int)$trayData['locked'] === 1) ? ' (Locked)' : ''; ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Scan Units</h3>
                  </div>
                  <div class="box-body">
                    <div class="form-group">
                      <label for="scan-imei">Scan/Enter IMEI</label>
                      <input type="text"
                             id="scan-imei"
                             class="form-control"
                             autocomplete="off"
                             placeholder="Scan IMEI and press Enter">
                      <p class="help-block">Scanned units will appear in the list below. Duplicate scans are ignored.</p>
                    </div>
                    <div class="alert alert-danger hide" id="scan-error"></div>
                    <div class="table-responsive">
                      <table class="table table-bordered" id="location-devices">
                        <thead>
                          <tr>
                            <th>IMEI</th>
                            <th>Model/Details</th>
                            <th>Brand</th>
                            <th>Grade</th>
                            <th>Color</th>
                            <th>GBs</th>
                            <th>Current Tray</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          <?php foreach ($existingItems as $item): ?>
                            <?php if ($item['item_imei'] === '') { continue; } ?>
                            <tr data-imei="<?php echo htmlspecialchars($item['item_imei']); ?>">
                              <td>
                                <?php echo htmlspecialchars($item['item_imei']); ?>
                                <input type="hidden" name="item_imei[]" value="<?php echo htmlspecialchars($item['item_imei']); ?>">
                              </td>
                              <td>
                                <?php echo htmlspecialchars($item['item_details']); ?>
                                <input type="hidden" name="item_details[]" value="<?php echo htmlspecialchars($item['item_details']); ?>">
                              </td>
                              <td>
                                <?php echo htmlspecialchars($item['item_brand']); ?>
                                <input type="hidden" name="item_brand[]" value="<?php echo htmlspecialchars($item['item_brand']); ?>">
                              </td>
                              <td>
                                <?php echo htmlspecialchars($item['item_grade']); ?>
                                <input type="hidden" name="item_grade[]" value="<?php echo htmlspecialchars($item['item_grade']); ?>">
                              </td>
                              <td>
                                <?php echo htmlspecialchars($item['item_color']); ?>
                                <input type="hidden" name="item_color[]" value="<?php echo htmlspecialchars($item['item_color']); ?>">
                              </td>
                              <td>
                                <?php echo htmlspecialchars($item['item_gb']); ?>
                                <input type="hidden" name="item_gb[]" value="<?php echo htmlspecialchars($item['item_gb']); ?>">
                              </td>
                              <td>
                                <?php echo htmlspecialchars($item['current_tray']); ?>
                                <input type="hidden" name="current_tray[]" value="<?php echo htmlspecialchars($item['current_tray']); ?>">
                              </td>
                              <td>
                                <button type="button" class="btn btn-danger btn-sm remove-device">
                                  <i class="fa fa-times"></i>
                                </button>
                              </td>
                            </tr>
                          <?php endforeach; ?>
                          <tr id="no-devices-row" <?php echo !empty($existingItems) ? 'class="hide"' : ''; ?>>
                            <td colspan="8" class="text-center">No devices added yet.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div class="box-footer">
                  <button type="submit" name="move_stock" value="1" class="btn btn-primary">
                    Move Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</div>

<?php include $global_url . "footer.php"; ?>
<script src="<?php echo $global_url; ?>products/admin_ops/location_management.js"></script>
</body>
</html>
