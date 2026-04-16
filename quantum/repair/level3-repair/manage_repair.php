<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php include "../../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Level 3 Repairs
      <small>Manage active repair cases</small>
    </h1>
    <ol class="breadcrumb">
      <li><a href="<?php echo $global_url; ?>dashboard"><i class="fa fa-dashboard"></i> Home</a></li>
      <li><a href="<?php echo $global_url; ?>repair/repair_menu.php">Repair Menu</a></li>
      <li class="active">Level 3 Repairs</li>
    </ol>
  </section>

  <!-- Main content -->
  <section class="content">
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
    
    <div class="row">
      <!-- Main content -->
      <div class="col-xs-12">
        <div class="box">
          <div class="box-header with-border">
            <h3 class="box-title">Active Repair Cases</h3>
            <div class="box-tools pull-right">
              <a href="completed_repairs.php" class="btn btn-info btn-sm">
                <i class="fa fa-check-circle"></i> Completed Repairs
              </a>
              <a href="book_repair.php" class="btn btn-success btn-sm">
                <i class="fa fa-plus"></i> Book In Repair
              </a>
            </div>
          </div>
          
          <!-- /.box-header -->
          <div class="box-body">
            <div class="row">
              <div class="col-sm-6">
                <div class="form-group">
                  <input type="text" class="form-control" id="search-imei" placeholder="Search by IMEI">
                </div>
              </div>
              <div class="col-sm-6">
                <div class="form-group">
                  <select class="form-control" id="filter-status">
                    <option value="">All Active Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_parts">Waiting for Parts</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="table-responsive">
              <table class="table table-bordered table-striped" id="level3-repairs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>IMEI</th>
                    <th>Location</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Supplier</th>
                    <th>Fault</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="9" class="text-center">
                      <i class="fa fa-spinner fa-spin fa-2x"></i><br>
                      Loading repair data...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <!-- /.box-body -->
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

<!-- Load jQuery directly from a CDN as fallback if local file doesn't exist -->
<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>

<!-- Now load jQuery-dependent scripts -->
<script src="<?php echo $global_url; ?>assets/js/jquery.dataTables.min.js"></script>
<script src="<?php echo $global_url; ?>assets/js/jquery-ui.min.js"></script>

<!-- Make sure jQuery is loaded before this script -->
<script>
// Wait for document to be fully loaded
window.addEventListener('load', function() {
  // Check if jQuery is actually loaded
  if (typeof jQuery === 'undefined') {
    console.error('jQuery is not loaded even after explicit inclusion. Loading data requires jQuery.');
    document.querySelector('#level3-repairs-table tbody').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Failed to load data: jQuery not available.</td></tr>';
    return;
  }

  // Using jQuery safely now
  jQuery(function($) {
    console.log('jQuery is loaded and running. Version:', $.fn.jquery);
    
    const repairDataCache = {};

    // Function to load repair data - modified to exclude completed and unrepairable
    function loadRepairData(imei = '', status = '') {
      const cacheKey = `${imei}-${status}-active`;
      
      // Check cache first
      if (repairDataCache[cacheKey]) {
        renderTableData(repairDataCache[cacheKey]);
        return;
      }
      
      // If not in cache, fetch from server
      $.ajax({
        url: 'fetch_repair_data.php',
        type: 'GET',
        data: {
          imei: imei,
          status: status,
          show_active_only: true  // New parameter to filter active repairs only
        },
        dataType: 'json',
        beforeSend: function() {
          $('#level3-repairs-table tbody').html('<tr><td colspan="9" class="text-center"><i class="fa fa-spinner fa-spin fa-2x"></i><br>Loading repair data...</td></tr>');
        },
        success: function(response) {
          // Cache the response
          repairDataCache[cacheKey] = response;
          renderTableData(response);
        },
        error: function(xhr, status, error) {
          console.error('AJAX Error:', error);
          $('#level3-repairs-table tbody').html('<tr><td colspan="9" class="text-center text-danger">Error loading data. Please try again. Details: ' + error + '</td></tr>');
        }
      });
    }
    
    function renderTableData(response) {
      let tableRows = '';
      
      if (response && response.data && response.data.length > 0) {
        $.each(response.data, function(index, row) {
          let statusClass = '';
          switch(row.status) {
            case 'pending':
              statusClass = 'label-warning';
              break;
            case 'in_progress':
              statusClass = 'label-info';
              break;
            case 'waiting_parts':
              statusClass = 'label-primary';
              break;
            default:
              statusClass = 'label-default';
          }
          
          tableRows += `
            <tr>
              <td>${row.date || ''}</td>
              <td>${row.item_imei || ''}</td>
              <td>${row.tray_id || ''}</td>
              <td>${row.manufacturer || 'Unknown'}</td>
              <td>${row.model || 'Unknown'}</td>
              <td>${row.supplier_name || 'Unknown'}</td>
              <td>${row.fault || 'Not specified'}</td>
              <td><span class="label ${statusClass}">${(row.status || 'unknown').charAt(0).toUpperCase() + (row.status || 'unknown').slice(1)}</span></td>
              <td>
                <a href="view_repair.php?imei=${row.item_imei}" class="btn btn-info btn-xs"><i class="fa fa-eye"></i> View</a>
                <a href="edit_repair.php?imei=${row.item_imei}" class="btn btn-primary btn-xs"><i class="fa fa-edit"></i> Edit</a>
              </td>
            </tr>
          `;
        });
      } else {
        tableRows = '<tr><td colspan="9" class="text-center">No active repair cases found.</td></tr>';
      }
      
      $('#level3-repairs-table tbody').html(tableRows);
    }
    
    // Load data on page load
    loadRepairData();
    
    // Handle IMEI search
    $('#search-imei').on('keyup', function() {
      const imei = $(this).val();
      const status = $('#filter-status').val();
      loadRepairData(imei, status);
    });
    
    // Handle status filter
    $('#filter-status').on('change', function() {
      const status = $(this).val();
      const imei = $('#search-imei').val();
      loadRepairData(imei, status);
    });
  });
});
</script>

<!-- Add a simple fallback in case data loading takes too long -->
<script>
setTimeout(function() {
  var tableData = document.querySelector('#level3-repairs-table tbody tr td');
  if (tableData && tableData.textContent.includes('Loading repair data')) {
    document.querySelector('#level3-repairs-table tbody').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Data loading timed out. Please reload the page to try again.</td></tr>';
  }
}, 15000); // Give it 15 seconds to load
</script>