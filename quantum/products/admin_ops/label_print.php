<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php"; ?>
<?php $global_url = "../../"; ?>
<?php
require_once "includes/label_helper.php";
$printerEndpoints = getAvailablePrintEndpoints();
$selectedEndpoint = resolvePrintEndpoint();
?>
<?php include "../../header.php"; ?>

<div class="content-wrapper">
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <div class="box">
          <div class="box-header">
            <h3 class="box-title">Label Print</h3>
          </div>
          <div class="box-body">

            <div class="row" style="margin-bottom: 15px;">
              <div class="col-sm-6">
                <label for="printer-endpoint">Printer destination</label>
                <select class="form-control" id="printer-endpoint" name="printer_endpoint">
                  <?php foreach ($printerEndpoints as $value => $label): ?>
                    <option value="<?php echo htmlspecialchars($value); ?>" <?php echo $value === $selectedEndpoint ? 'selected' : ''; ?>>
                      <?php echo htmlspecialchars($label); ?>
                    </option>
                  <?php endforeach; ?>
                </select>
                <p class="help-block">Selection is saved per user/session so each station can target its own printer.</p>
              </div>
            </div>


            <!-- Tab Navigation -->
            <ul class="nav nav-tabs" role="tablist">
              <li role="presentation" class="active">
                <a href="#manual-entry" aria-controls="manual-entry" role="tab" data-toggle="tab">
                  Manual Entry
                </a>
              </li>
              <li role="presentation">
                <a href="#csv-upload" aria-controls="csv-upload" role="tab" data-toggle="tab">
                  CSV Upload
                </a>
              </li>
              <li role="presentation">
                <a href="#xlsx-upload" aria-controls="xlsx-upload" role="tab" data-toggle="tab">
                  XLSX Upload
                </a>
              </li>
            </ul>

            <!-- Tab Content -->
            <div class="tab-content" style="margin-top: 20px;">

              <!-- Manual Entry Tab -->
              <div role="tabpanel" class="tab-pane active" id="manual-entry">
                <div class="alert alert-info">
                  Enter or scan an IMEI number to print a label
                </div>
                <form id="manualEntryForm">
                  <div class="form-group">
                    <label for="imei-input">IMEI Number</label>
                    <input type="text"
                           class="form-control"
                           id="imei-input"
                           name="imei"
                           placeholder="Enter or scan IMEI"
                           autocomplete="off"
                           autofocus
                           required>
                  </div>
                  <button type="submit" class="btn btn-success">
                    <i class="fa fa-print"></i> Print Label
                  </button>
                </form>

                <!-- Recent prints table -->
                <div id="recent-prints" style="margin-top: 30px;">
                  <h4>Recent Labels</h4>
                  <table class="table table-bordered table-striped" id="recent-prints-table">
                    <thead>
                      <tr>
                        <th>IMEI</th>
                        <th>Device</th>
                        <th>Status</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody id="recent-prints-body">
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- CSV Upload Tab -->
              <div role="tabpanel" class="tab-pane" id="csv-upload">
                <div class="alert alert-info">
                  Upload a CSV file with IMEI numbers
                </div>
                <form id="csvUploadForm" enctype="multipart/form-data">
                  <div class="form-group">
                    <label for="csv-file">CSV File</label>
                    <input type="file"
                           class="form-control"
                           id="csv-file"
                           name="csv_file"
                           accept=".csv"
                           required>
                    <p class="help-block">Upload a CSV file containing IMEI numbers</p>
                  </div>
                  <button type="submit" class="btn btn-success">
                    <i class="fa fa-upload"></i> Upload and Print
                  </button>
                </form>
                <div id="csv-progress" class="hide" style="margin-top: 20px;">
                  <div class="progress">
                    <div class="progress-bar progress-bar-striped active"
                         role="progressbar"
                         id="csv-progress-bar"
                         style="width: 0%">
                      <span id="csv-progress-text">0%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- XLSX Upload Tab -->
              <div role="tabpanel" class="tab-pane" id="xlsx-upload">
                <div class="alert alert-info">
                  Upload an XLSX file with IMEI numbers in the 2nd column
                </div>
                <form id="xlsxUploadForm" enctype="multipart/form-data">
                  <div class="form-group">
                    <label for="xlsx-file">XLSX File</label>
                    <input type="file"
                           class="form-control"
                           id="xlsx-file"
                           name="xlsx_file"
                           accept=".xlsx"
                           required>
                    <p class="help-block">Upload an XLSX file with IMEI numbers in the 2nd column</p>
                  </div>
                  <button type="submit" class="btn btn-success">
                    <i class="fa fa-upload"></i> Upload and Print
                  </button>
                </form>
                <div id="xlsx-progress" class="hide" style="margin-top: 20px;">
                  <div class="progress">
                    <div class="progress-bar progress-bar-striped active"
                         role="progressbar"
                         id="xlsx-progress-bar"
                         style="width: 0%">
                      <span id="xlsx-progress-text">0%</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<?php include $global_url . "footer.php"; ?>
<script>
var selectedEndpoint = <?php echo json_encode($selectedEndpoint); ?>;

$(function () {
  var printMode = 'cloud'; // Always use cloud mode
  var previousEndpoint = selectedEndpoint;

  $('#printer-endpoint').on('change', function() {
    var newEndpoint = $(this).val();
    previousEndpoint = selectedEndpoint;
    selectedEndpoint = newEndpoint;

    $.ajax({
      url: 'includes/set_print_endpoint.php',
      method: 'POST',
      data: {
        endpoint: newEndpoint
      },
      dataType: 'json'
    }).done(function(response) {
      if (response.success) {
        showNotification('Printer set to ' + response.label, 'success');
      } else {
        alert(response.message || 'Unable to save printer selection.');
      }
    }).fail(function() {
      selectedEndpoint = previousEndpoint;
      $('#printer-endpoint').val(previousEndpoint);
      alert('Unable to save printer selection. Please try again.');
    });
  });

  // Handle manual entry form
  $('#manualEntryForm').on('submit', function(e) {
    e.preventDefault();
    var imei = $('#imei-input').val().trim();

    if (!imei) {
      alert('Please enter an IMEI number');
      return;
    }

    printSingleLabel(imei);
  });

  function printSingleLabel(imei) {
    $.ajax({
      url: 'includes/print_label.php',
      method: 'POST',
      data: {
        imei: imei,
        mode: printMode,
        endpoint: selectedEndpoint
      },
      dataType: 'json',
      beforeSend: function() {
        $('#imei-input').prop('disabled', true);
      }
    }).done(function(response) {
      if (response.success) {
        // Add to recent prints table
        var row = '<tr>' +
          '<td>' + response.imei + '</td>' +
          '<td>' + response.device_info + '</td>' +
          '<td><span class="label label-success">Printed</span></td>' +
          '<td>' + new Date().toLocaleTimeString() + '</td>' +
          '</tr>';
        $('#recent-prints-body').prepend(row);

        // Clear input
        $('#imei-input').val('');

        // Show success message
        showNotification('Label printed successfully', 'success');
      } else {
        var errorMsg = response.message || 'Unable to print label';
        if (response.debug) {
          errorMsg += '\n\nDebug Info:\n' +
            'IMEI: ' + response.debug.imei + '\n' +
            'Database: ' + response.debug.current_db + '\n' +
            'View exists: ' + response.debug.view_exists;
        }
        alert('Error: ' + errorMsg);
      }
    }).fail(function(jqXHR, textStatus, errorThrown) {
      console.error('AJAX error:', textStatus, errorThrown);
      console.error('Response:', jqXHR.responseText);
      alert('Network error. Please try again.\n\nDetails: ' + textStatus);
    }).always(function() {
      // Re-enable input and refocus for next scan
      $('#imei-input').prop('disabled', false).focus();
    });
  }

  // Handle CSV upload
  $('#csvUploadForm').on('submit', function(e) {
    e.preventDefault();

    var formData = new FormData(this);
    formData.append('mode', printMode);
    formData.append('endpoint', selectedEndpoint);

    $.ajax({
      url: 'includes/process_csv.php',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      dataType: 'json',
      beforeSend: function() {
        $('#csv-progress').removeClass('hide');
        updateProgress('csv', 0);
      },
      xhr: function() {
        var xhr = new window.XMLHttpRequest();
        // Upload progress not available for response, handled by polling or response
        return xhr;
      }
    }).done(function(response) {
      if (response.success) {
        updateProgress('csv', 100);
        showNotification('Printed ' + response.printed + ' labels successfully', 'success');
        $('#csvUploadForm')[0].reset();
        setTimeout(function() {
          $('#csv-progress').addClass('hide');
        }, 2000);
      } else {
        alert('Error: ' + (response.message || 'Unable to process CSV'));
        $('#csv-progress').addClass('hide');
      }
    }).fail(function() {
      alert('Network error. Please try again.');
      $('#csv-progress').addClass('hide');
    });
  });

  // Handle XLSX upload
  $('#xlsxUploadForm').on('submit', function(e) {
    e.preventDefault();

    var formData = new FormData(this);
    formData.append('mode', printMode);
    formData.append('endpoint', selectedEndpoint);

    $.ajax({
      url: 'includes/process_xlsx.php',
      method: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      dataType: 'json',
      beforeSend: function() {
        $('#xlsx-progress').removeClass('hide');
        updateProgress('xlsx', 0);
      }
    }).done(function(response) {
      if (response.success) {
        updateProgress('xlsx', 100);
        showNotification('Printed ' + response.printed + ' labels successfully', 'success');
        $('#xlsxUploadForm')[0].reset();
        setTimeout(function() {
          $('#xlsx-progress').addClass('hide');
        }, 2000);
      } else {
        alert('Error: ' + (response.message || 'Unable to process XLSX'));
        $('#xlsx-progress').addClass('hide');
      }
    }).fail(function() {
      alert('Network error. Please try again.');
      $('#xlsx-progress').addClass('hide');
    });
  });

  function updateProgress(type, percent) {
    $('#' + type + '-progress-bar').css('width', percent + '%');
    $('#' + type + '-progress-text').text(percent + '%');
  }

  function showNotification(message, type) {
    var alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    var alert = $('<div class="alert ' + alertClass + ' alert-dismissible" role="alert">' +
      '<button type="button" class="close" data-dismiss="alert">&times;</button>' +
      message + '</div>');
    $('.box-body').prepend(alert);
    setTimeout(function() {
      alert.fadeOut(function() { $(this).remove(); });
    }, 3000);
  }
});
</script>
</body>
</html>
