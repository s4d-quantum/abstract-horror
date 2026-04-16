<?php
$global_url = "../../";
include '../../db_config.php';
include "../../authenticate.php";
include "../../header.php";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Completed Repairs
      <small>View completed and unrepairable cases</small>
    </h1>
    <ol class="breadcrumb">
      <li><a href="<?php echo $global_url; ?>dashboard"><i class="fa fa-dashboard"></i> Home</a></li>
      <li><a href="<?php echo $global_url; ?>repair/repair_menu.php">Repair Menu</a></li>
      <li><a href="manage_repair.php">Level 3 Repairs</a></li>
      <li class="active">Completed Repairs</li>
    </ol>
  </section>

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <!-- Main content -->
      <div class="col-xs-12">
        <div class="box">
          <div class="box-header with-border">
            <h3 class="box-title">Completed Repair Cases</h3>
            <div class="box-tools pull-right">
              <a href="manage_repair.php" class="btn btn-primary btn-sm">
                <i class="fa fa-wrench"></i> Active Repairs
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
                    <option value="">All Completed Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="unrepairable">Unrepairable</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div class="table-responsive">
              <table class="table table-bordered table-striped" id="completed-repairs-table">
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
    document.querySelector('#completed-repairs-table tbody').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Failed to load data: jQuery not available.</td></tr>';
    return;
  }

  // Using jQuery safely now
  jQuery(function($) {
    console.log('jQuery is loaded and running. Version:', $.fn.jquery);
    
    const repairDataCache = {};

    // Function to load repair data - specifically for completed/unrepairable
    function loadRepairData(imei = '', status = '') {
      const cacheKey = `${imei}-${status}-completed`;
      
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
          show_completed_only: true  // New parameter to filter completed repairs only
        },
        dataType: 'json',
        beforeSend: function() {
          $('#completed-repairs-table tbody').html('<tr><td colspan="9" class="text-center"><i class="fa fa-spinner fa-spin fa-2x"></i><br>Loading repair data...</td></tr>');
        },
        success: function(response) {
          // Cache the response
          repairDataCache[cacheKey] = response;
          renderTableData(response);
        },
        error: function(xhr, status, error) {
          console.error('AJAX Error:', error);
          $('#completed-repairs-table tbody').html('<tr><td colspan="9" class="text-center text-danger">Error loading data. Please try again. Details: ' + error + '</td></tr>');
        }
      });
    }
    
    function renderTableData(response) {
      let tableRows = '';
      
      if (response && response.data && response.data.length > 0) {
        $.each(response.data, function(index, row) {
          let statusClass = '';
          switch(row.status) {
            case 'completed':
              statusClass = 'label-success';
              break;
            case 'unrepairable':
              statusClass = 'label-danger';
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
              </td>
            </tr>
          `;
        });
      } else {
        tableRows = '<tr><td colspan="9" class="text-center">No completed repair cases found.</td></tr>';
      }
      
      $('#completed-repairs-table tbody').html(tableRows);
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
  var tableData = document.querySelector('#completed-repairs-table tbody tr td');
  if (tableData && tableData.textContent.includes('Loading repair data')) {
    document.querySelector('#completed-repairs-table tbody').innerHTML = 
      '<tr><td colspan="9" class="text-center text-danger">Data loading timed out. Please reload the page to try again.</td></tr>';
  }
}, 15000); // Give it 15 seconds to load
</script>