<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php"; ?>
<?php $global_url = "../../"; ?>
<?php include "../../header.php"; ?>

<?php
$operationId = isset($_GET['id']) ? intval($_GET['id']) : 0;
$operationDetail = null;
$operationDevices = [];

if ($operationId > 0) {
  $detailSql = "
    SELECT 
      ao.id,
      ao.date,
      ao.time,
      ao.user_id,
      ao.operation,
      ao.reason,
      COALESCE(acc.user_name, ao.user_id) AS user_name
    FROM tbl_adminops ao
    LEFT JOIN tbl_accounts acc ON acc.user_id = ao.user_id
    WHERE ao.id = {$operationId}
    LIMIT 1
  ";

  if ($result = mysqli_query($conn, $detailSql)) {
    $operationDetail = mysqli_fetch_assoc($result);
    mysqli_free_result($result);
  }

  if ($operationDetail) {
    $devicesSql = "
      SELECT item_imei, old_tray_id, new_tray_id
      FROM tbl_adminops_devices
      WHERE adminop_id = {$operationId}
      ORDER BY id ASC
    ";
    if ($deviceResult = mysqli_query($conn, $devicesSql)) {
      while ($device = mysqli_fetch_assoc($deviceResult)) {
        $operationDevices[] = $device;
      }
      mysqli_free_result($deviceResult);
    }
  }
}
?>

<div class="content-wrapper">
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <div class="box">
                <div class="box-header">
                  <h3 class="box-title">Admin Ops Detail</h3>
                </div>
                <div class="box-body">
                  <?php if ($operationDetail): ?>
                    <?php
                      $formattedDate = !empty($operationDetail['date']) ? date('d/m/Y', strtotime($operationDetail['date'])) : '-';
                      $formattedTime = !empty($operationDetail['time']) ? date('H:i', strtotime($operationDetail['time'])) : '-';
                      $reasonText = isset($operationDetail['reason']) && $operationDetail['reason'] !== '' ? $operationDetail['reason'] : '-';
                    ?>
                    <dl class="dl-horizontal">
                      <dt>Date</dt>
                      <dd><?php echo htmlspecialchars($formattedDate); ?></dd>
                      <dt>Time</dt>
                      <dd><?php echo htmlspecialchars($formattedTime); ?></dd>
                      <dt>User</dt>
                      <dd><?php echo htmlspecialchars($operationDetail['user_name']); ?></dd>
                      <dt>Operation</dt>
                      <dd><?php echo htmlspecialchars($operationDetail['operation']); ?></dd>
                      <dt>Reason</dt>
                      <dd><?php echo htmlspecialchars($reasonText); ?></dd>
                    </dl>
                  <?php else: ?>
                    <div class="alert alert-danger">
                      Admin operation not found or has been removed.
                    </div>
                  <?php endif; ?>
                </div>
              </div>

              <?php if ($operationDetail): ?>
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Affected Units</h3>
                  </div>
                  <div class="box-body">
                    <table id="admin-ops-devices-table" class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>IMEI</th>
                          <th>Original Tray</th>
                          <th>New Tray</th>
                        </tr>
                      </thead>
                      <tbody>
                        <?php foreach ($operationDevices as $device): ?>
                          <tr>
                            <td><?php echo htmlspecialchars($device['item_imei']); ?></td>
                            <td><?php echo htmlspecialchars($device['old_tray_id']); ?></td>
                            <td><?php echo htmlspecialchars($device['new_tray_id']); ?></td>
                          </tr>
                        <?php endforeach; ?>
                      </tbody>
                    </table>
                    <?php if (empty($operationDevices)): ?>
                      <div class="alert alert-info" style="margin-top:15px;">No devices recorded for this operation.</div>
                    <?php endif; ?>
                  </div>
                </div>
              <?php endif; ?>

              <a href="index.php" class="btn btn-default">Back to Admin Ops</a>

            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</div>

<?php include $global_url . "footer.php"; ?>
<?php if ($operationDetail): ?>
<script>
  $(function () {
    if ($.fn.DataTable) {
      $('#admin-ops-devices-table').DataTable({
        language: {
          emptyTable: 'No devices recorded for this operation.'
        }
      });
    }
  });
</script>
<?php endif; ?>
</body>
</html>
