<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php"; ?>
<?php $global_url = "../../"; ?>
<?php include "../../header.php"; ?>

<?php
$adminOps = [];
$adminOpsSql = "
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
  ORDER BY ao.date DESC, ao.time DESC, ao.id DESC
  LIMIT 10
";

if ($result = mysqli_query($conn, $adminOpsSql)) {
  while ($row = mysqli_fetch_assoc($result)) {
    $adminOps[] = $row;
  }
  mysqli_free_result($result);
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
                  <h3 class="box-title">Admin Ops</h3>
                </div>
                <div class="box-body">
                  <div class="alert alert-warning">
                    these features are locked, you will be required to enter a pin code and a reason
                  </div>
                  <table id="admin-ops-table" class="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>User</th>
                        <th>Operation</th>
                        <th>Reason</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php foreach ($adminOps as $operation): ?>
                        <?php
                          $formattedDate = !empty($operation['date']) ? date('d/m/Y', strtotime($operation['date'])) : '-';
                          $formattedTime = !empty($operation['time']) ? date('H:i', strtotime($operation['time'])) : '-';
                          $reasonText = isset($operation['reason']) && $operation['reason'] !== '' ? $operation['reason'] : '-';
                        ?>
                        <tr>
                          <td><?php echo htmlspecialchars($formattedDate); ?></td>
                          <td><?php echo htmlspecialchars($formattedTime); ?></td>
                          <td><?php echo htmlspecialchars($operation['user_name']); ?></td>
                          <td><?php echo htmlspecialchars($operation['operation']); ?></td>
                          <td><?php echo htmlspecialchars($reasonText); ?></td>
                          <td>
                            <a href="admin_ops_detail.php?id=<?php echo urlencode($operation['id']); ?>" class="btn btn-primary btn-sm">
                              View
                            </a>
                          </td>
                        </tr>
                      <?php endforeach; ?>
                    </tbody>
                  </table>
                  <?php if (empty($adminOps)): ?>
                    <div class="alert alert-info" style="margin-top:15px;">No admin operations recorded yet.</div>
                  <?php endif; ?>
                </div>
              </div>

              <div class="box">
                <div class="box-header">
                  <h3 class="box-title">Locked Actions</h3>
                </div>
                <div class="box-body">
                  <div class="row">
                    <div class="col-sm-4">
                      <button type="button"
                              class="btn btn-block btn-lg btn-info admin-ops-action"
                              data-operation="Location Management">
                        Location Management
                      </button>
                    </div>
                    <div class="col-sm-4">
                      <button type="button"
                              class="btn btn-block btn-lg btn-info admin-ops-action"
                              data-operation="Color Check">
                        Color Check
                      </button>
                    </div>
                    <div class="col-sm-4">
                      <button type="button"
                              class="btn btn-block btn-lg btn-info admin-ops-action"
                              data-operation="Label Print">
                        Label Print
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</div>

<!-- Unlock Modal -->
<div class="modal fade" id="adminOpsModal" tabindex="-1" role="dialog" aria-labelledby="adminOpsModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form id="adminOpsForm">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
          <h4 class="modal-title" id="adminOpsModalLabel">Unlock Admin Operation</h4>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger hide" id="adminOpsError"></div>
          <input type="hidden" name="operation" id="adminOpsOperation" value="">
          <div class="form-group">
            <label for="adminOpsPin">PIN Code</label>
            <input type="password" class="form-control" id="adminOpsPin" name="pin" autocomplete="off" required>
          </div>
          <div class="form-group" id="adminOpsReasonGroup">
            <label for="adminOpsReason">Reason</label>
            <input type="text" class="form-control" id="adminOpsReason" name="reason" placeholder="Enter reason">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
          <button type="submit" class="btn btn-primary">Unlock</button>
        </div>
      </form>
    </div>
  </div>
</div>

<?php include $global_url . "footer.php"; ?>
<script>
$(function () {
  if ($.fn.DataTable) {
    $('#admin-ops-table').DataTable({
      order: [[0, 'desc'], [1, 'desc']],
      columnDefs: [
        { orderable: false, targets: -1 }
      ],
      language: {
        emptyTable: 'No admin operations recorded yet.'
      }
    });
  }

  var $modal = $('#adminOpsModal');
  var $form = $('#adminOpsForm');
  var $operationInput = $('#adminOpsOperation');
  var $reasonGroup = $('#adminOpsReasonGroup');
  var $reasonInput = $('#adminOpsReason');
  var $errorBox = $('#adminOpsError');

  if (!$modal.parent().is('body')) {
    $modal.appendTo('body');
  }

  $('.admin-ops-action').on('click', function () {
    var operation = $(this).data('operation');
    $form[0].reset();
    $errorBox.addClass('hide').text('');
    $operationInput.val(operation);

    if (operation === 'Location Management') {
      $reasonGroup.show();
      $reasonInput.prop('required', true).val('');
    } else {
      $reasonGroup.hide();
      $reasonInput.prop('required', false).val('color check');
    }

    $modal.modal('show');
  });

  $form.on('submit', function (event) {
    event.preventDefault();
    $errorBox.addClass('hide').text('');

    $.ajax({
      url: 'verify_pin.php',
      method: 'POST',
      data: $form.serialize(),
      dataType: 'json'
    }).done(function (response) {
      if (response.success && response.redirect) {
        window.location.href = response.redirect;
      } else {
        $errorBox.removeClass('hide').text(response.message || 'Unable to unlock this feature.');
      }
    }).fail(function () {
      $errorBox.removeClass('hide').text('Unexpected error. Please try again.');
    });
  });
});
</script>
</body>
</html>
