<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php include "../../header.php" ?>

<?php
// Add function to check if a location is occupied
function isLocationOccupied($conn, $location) {
    // Don't check if location is empty
    if (empty($location)) {
        return false;
    }
    
    $query = "SELECT COUNT(*) as count FROM tbl_purchases WHERE tray_id = ?";
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "s", $location);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    return $row['count'] > 0;
}

// Also check if a location is occupied by a completed repair that can be overwritten
function isLocationFree($conn, $location) {
    // First check if location exists in purchases
    if (!isLocationOccupied($conn, $location)) {
        return true; // Location is not occupied at all
    }
    
    // Check if the device in this location has a completed/unrepairable status
    $query = "
        SELECT COUNT(*) as count
        FROM tbl_purchases p
        JOIN level3_repair r ON p.item_imei = r.item_imei
        WHERE p.tray_id = ? 
        AND (r.status = 'completed' OR r.status = 'unrepairable')
    ";
    
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "s", $location);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $row = mysqli_fetch_assoc($result);
    
    return $row['count'] > 0; // If > 0, location has completed repair and is free
}
?>

<!-- Display success/error messages -->
<?php if (isset($_SESSION['success_message'])): ?>
  <div class="alert alert-success alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
    <h4><i class="icon fa fa-check"></i> Success!</h4>
    <?php 
      echo $_SESSION['success_message']; 
      unset($_SESSION['success_message']);
    ?>
  </div>
<?php endif; ?>

<?php if (isset($_SESSION['error_message'])): ?>
  <div class="alert alert-danger alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
    <h4><i class="icon fa fa-ban"></i> Error!</h4>
    <?php 
      echo $_SESSION['error_message']; 
      unset($_SESSION['error_message']);
    ?>
  </div>
<?php endif; ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Book Level 3 Repair
      <small>Enter repair details</small>
    </h1>
    <ol class="breadcrumb">
      <li><a href="<?php echo $global_url; ?>dashboard"><i class="fa fa-dashboard"></i> Home</a></li>
      <li><a href="<?php echo $global_url; ?>repair/repair_menu.php">Repair Menu</a></li>
      <li><a href="manage_repair.php">Level 3 Repairs</a></li>
      <li class="active">Book Repair</li>
    </ol>
  </section>

  <!-- Main content -->
  <section class="content">
    <!-- Display validation errors -->
    <div id="validation-errors" class="alert alert-danger" style="display: none;">
      <h4><i class="icon fa fa-ban"></i> Error!</h4>
      <div id="error-message"></div>
    </div>
    
    <div class="row">
      <div class="col-md-12">
        <div class="box box-primary">
          <div class="box-header with-border">
            <h3 class="box-title">Repair Details</h3>
          </div>
          <!-- /.box-header -->
          
          <!-- form start -->
          <form role="form" action="process_repair_booking.php" method="post">
            <div class="box-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="imei">IMEI Number <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="imei" name="imei" placeholder="Scan or enter IMEI number" required autofocus>
                    <span class="help-block" id="imei-validation"></span>
                  </div>
                  
                  <div class="form-group">
                    <label for="manufacturer">Manufacturer</label>
                    <input type="text" class="form-control" id="manufacturer" name="manufacturer" readonly>
                  </div>
                  
                  <div class="form-group">
                    <label for="model">Model</label>
                    <input type="text" class="form-control" id="model" name="model" readonly>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="tray_id">Location <span class="text-danger">*</span></label>
                    <select class="form-control" id="tray_id" name="tray_id" required>
                      <option value="">Select Location</option>
                      <?php
                      // Fetch all Level 3 trays dynamically and compute availability efficiently
                      // 1) Get all tray IDs for level3 from tbl_trays
                      $trays_sql = "SELECT tray_id FROM tbl_trays WHERE tray_id LIKE 'level3\_%' ORDER BY CAST(SUBSTRING(tray_id, 8) AS UNSIGNED)";
                      $trays_res = mysqli_query($conn, $trays_sql);
                      $trays = [];
                      if ($trays_res) {
                        while ($r = mysqli_fetch_assoc($trays_res)) {
                          $trays[] = $r['tray_id'];
                        }
                      }

                      if (empty($trays)) {
                        // Fallback: if tbl_trays not populated, default to 1..10
                        for ($i = 1; $i <= 10; $i++) { $trays[] = 'level3_' . $i; }
                      }

                      // 2) Build occupancy map in one go from tbl_purchases
                      $occupied = [];
                      $sql_occ = "SELECT tray_id, COUNT(*) AS cnt FROM tbl_purchases WHERE tray_id LIKE 'level3\_%' GROUP BY tray_id";
                      if ($res_occ = mysqli_query($conn, $sql_occ)) {
                        while ($row = mysqli_fetch_assoc($res_occ)) {
                          $occupied[$row['tray_id']] = (int)$row['cnt'] > 0;
                        }
                      }

                      // 3) Trays that are safe to overwrite because repair is completed/unrepairable
                      $free_overwrite = [];
                      $sql_free = "SELECT p.tray_id
                                   FROM tbl_purchases p
                                   JOIN level3_repair r ON p.item_imei = r.item_imei
                                   WHERE p.tray_id LIKE 'level3\_%' AND r.status IN ('completed','unrepairable')
                                   GROUP BY p.tray_id";
                      if ($res_free = mysqli_query($conn, $sql_free)) {
                        while ($row = mysqli_fetch_assoc($res_free)) {
                          $free_overwrite[$row['tray_id']] = true;
                        }
                      }

                      // 4) Render options
                      foreach ($trays as $location) {
                        $is_occ = !empty($occupied[$location]);
                        $can_overwrite = !empty($free_overwrite[$location]);
                        $is_disabled = $is_occ && !$can_overwrite;
                        $status = $is_disabled ? ' (Occupied)' : ' (Available)';
                        $disabled_attr = $is_disabled ? 'disabled' : '';
                        echo "<option value='{$location}' {$disabled_attr}>{$location}{$status}</option>";
                      }
                      ?>
                    </select>
                    <span class="help-block">Only available locations can be selected</span>
                  </div>
                  
                  <div class="form-group">
                    <label for="status">Status</label>
                    <select class="form-control" id="status" name="status">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_parts">Waiting for Parts</option>
                      <option value="completed">Completed</option>
                      <option value="unrepairable">Unrepairable</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="fault">Fault Description <span class="text-danger">*</span></label>
                <textarea class="form-control" id="fault" name="fault" rows="3" required></textarea>
              </div>
              
              <div class="form-group">
                <label for="engineer_notes">Engineer Notes</label>
                <textarea class="form-control" id="engineer_notes" name="engineer_notes" rows="3"></textarea>
              </div>
            </div>
            <!-- /.box-body -->

            <div class="box-footer">
              <button type="submit" class="btn btn-primary">Book Repair</button>
              <a href="manage_repair.php" class="btn btn-default">Cancel</a>
            </div>
          </form>
        </div>
        <!-- /.box -->
      </div>
      <!-- /.col -->
    </div>
    <!-- /.row -->
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<?php include $global_url."footer.php";?>

<!-- Page-specific scripts -->
<script>
$(document).ready(function() {
  // IMEI validation and auto-fill for manufacturer and model
  $('#imei').on('input', function() {
    var imei = $(this).val();
    
    // Clear validation message
    $('#imei-validation').text('');
    
    // Only proceed if IMEI is at least 8 characters (TAC code length)
    if (imei.length >= 8) {
      // Extract TAC code (first 8 digits)
      var tacCode = imei.substring(0, 8);
      
      // Fetch device details using AJAX
      $.ajax({
        url: 'get_device_details.php',
        type: 'POST',
        data: {tac: tacCode},
        dataType: 'json',
        success: function(response) {
          if (response.success) {
            // Auto-fill manufacturer and model fields
            $('#manufacturer').val(response.manufacturer);
            $('#model').val(response.model);
            
            // Add validation message
            if (response.manufacturer && response.model) {
              $('#imei-validation').text('Device identified: ' + response.manufacturer + ' ' + response.model)
                                  .removeClass('text-danger')
                                  .addClass('text-success');
            }
          } else {
            // Clear manufacturer and model fields
            $('#manufacturer').val('');
            $('#model').val('');
            
            // Add validation message
            $('#imei-validation').text('Device not found in database. Please enter details manually.')
                                .removeClass('text-success')
                                .addClass('text-danger');
          }
        },
        error: function() {
          // Clear manufacturer and model fields
          $('#manufacturer').val('');
          $('#model').val('');
          
          // Add validation message
          $('#imei-validation').text('Error fetching device details. Please try again.')
                              .removeClass('text-success')
                              .addClass('text-danger');
        }
      });
    } else {
      // Clear manufacturer and model fields
      $('#manufacturer').val('');
      $('#model').val('');
    }
  });

  // Form validation
  $('form').on('submit', function(e) {
    var imei = $('#imei').val();
    var fault = $('#fault').val();
    var tray = $('#tray_id').val();
    
    if (!imei || !fault || !tray) {
      e.preventDefault();
      $('#error-message').text('Please fill in all required fields');
      $('#validation-errors').show();
      window.scrollTo(0, 0);
      return false;
    }
    
    // Additional location validation (just in case it was manipulated client-side)
    var selectedLocation = $('#tray_id option:selected');
    if (selectedLocation.is(':disabled')) {
      e.preventDefault();
      $('#error-message').text('The selected location is already occupied. Please choose another location.');
      $('#validation-errors').show();
      window.scrollTo(0, 0);
      return false;
    }
  });
});
</script>

</body>
</html>
