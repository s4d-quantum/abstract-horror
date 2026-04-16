<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php include "../../header.php" ?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Optimized Picking System
      <small>Smart unit selection for warehouse staff</small>
    </h1>
  </section>

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <div class="box">
          <div class="box-header">
            <h3 class="box-title">Sales Order Picking</h3>
          </div>
          <!-- /.box-header -->
          <div class="box-body">
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Sales Order ID</label>
                  <input type="text" id="sales_order_id" class="form-control" placeholder="Enter sales order ID">
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Action</label>
                  <button id="load_order_btn" class="btn btn-primary form-control">Load Order</button>
                </div>
              </div>
            </div>

            <div id="order_info" class="hide">
              <div class="callout callout-info">
                <h4>Order Information</h4>
                <p><strong>Order ID:</strong> <span id="order_id_display"></span></p>
                <p><strong>Customer:</strong> <span id="customer_display"></span></p>
                <p><strong>PO Ref:</strong> <span id="po_ref_display"></span></p>
                <p><strong>Items to Pick:</strong> <span id="items_count_display"></span></p>
              </div>

              <div class="nav-tabs-custom">
                <ul class="nav nav-tabs">
                  <li class="active"><a href="#priority_picking" data-toggle="tab">Priority Picking</a></li>
                  <li><a href="#alternative_suggestions" data-toggle="tab">Alternative Suggestions</a></li>
                  <li><a href="#reservation_status" data-toggle="tab">Reservation Status</a></li>
                </ul>
                <div class="tab-content">
                  <div class="tab-pane active" id="priority_picking">
                    <div class="table-responsive">
                      <table class="table table-bordered">
                        <thead>
                          <tr>
                            <th>IMEI</th>
                            <th>Model</th>
                            <th>Color</th>
                            <th>Grade</th>
                            <th>Storage</th>
                            <th>Tray Location</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody id="priority_picking_table">
                          <!-- Priority picking items will be loaded here -->
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="tab-pane" id="alternative_suggestions">
                    <div class="table-responsive">
                      <table class="table table-bordered">
                        <thead>
                          <tr>
                            <th>Original IMEI</th>
                            <th>Alternative IMEI</th>
                            <th>Model</th>
                            <th>Tray Location</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody id="alternative_suggestions_table">
                          <!-- Alternative suggestions will be loaded here -->
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="tab-pane" id="reservation_status">
                    <div class="table-responsive">
                      <table class="table table-bordered">
                        <thead>
                          <tr>
                            <th>IMEI</th>
                            <th>Reservation Status</th>
                            <th>Reserved For Order</th>
                            <th>Reservation Age</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody id="reservation_status_table">
                          <!-- Reservation status will be loaded here -->
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-12">
                  <button id="complete_picking_btn" class="btn btn-success btn-lg pull-right hide">Complete Picking</button>
                </div>
              </div>
            </div>
          </div>
          <!-- /.box-body -->
        </div>
        <!-- /.box -->
      </div>
    </div>
  </section>
  <!-- /.content -->
</div>
<!-- /.content-wrapper -->

<?php include "../../footer.php" ?>

<script src="../../assets/js/xlsx.full.min.js"></script>
<script>
$(document).ready(function() {
    // Load order button click handler
    $('#load_order_btn').click(function() {
        var orderId = $('#sales_order_id').val().trim();
        if (orderId === '') {
            alert('Please enter a sales order ID');
            return;
        }

        loadSalesOrder(orderId);
    });

    function loadSalesOrder(orderId) {
        $.ajax({
            url: 'includes/fetch_picking_data.php',
            type: 'POST',
            data: {
                order_id: orderId,
                action: 'load_order'
            },
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    displayOrderInfo(response.order_info);
                    displayPriorityPicking(response.priority_items);
                    displayAlternativeSuggestions(response.alternatives);
                    displayReservationStatus(response.reservation_status);
                    $('#complete_picking_btn').removeClass('hide');
                } else {
                    alert('Error: ' + response.message);
                }
            },
            error: function() {
                alert('Error loading sales order data');
            }
        });
    }

    function displayOrderInfo(info) {
        $('#order_id_display').text(info.order_id);
        $('#customer_display').text(info.customer_name);
        $('#po_ref_display').text(info.po_ref);
        $('#items_count_display').text(info.item_count);
        $('#order_info').removeClass('hide');
    }

    function displayPriorityPicking(items) {
        var tableBody = $('#priority_picking_table');
        tableBody.empty();

        if (items.length === 0) {
            tableBody.append('<tr><td colspan="8" class="text-center">No items to pick</td></tr>');
            return;
        }

        $.each(items, function(index, item) {
            var statusClass = item.is_reserved ? 'label-warning' : 'label-success';
            var statusText = item.is_reserved ? 'Reserved' : 'Available';

            var row = '<tr>' +
                '<td>' + item.imei + '</td>' +
                '<td>' + item.model + '</td>' +
                '<td>' + item.color + '</td>' +
                '<td>' + item.grade + '</td>' +
                '<td>' + item.storage + '</td>' +
                '<td>' + item.tray_location + '</td>' +
                '<td><span class="label ' + statusClass + '">' + statusText + '</span></td>' +
                '<td><button class="btn btn-primary btn-sm pick-btn" data-imei="' + item.imei + '">Pick</button></td>' +
                '</tr>';

            tableBody.append(row);
        });

        // Add pick button handlers
        $('.pick-btn').click(function() {
            var imei = $(this).data('imei');
            markItemAsPicked(imei);
        });
    }

    function displayAlternativeSuggestions(alternatives) {
        var tableBody = $('#alternative_suggestions_table');
        tableBody.empty();

        if (alternatives.length === 0) {
            tableBody.append('<tr><td colspan="5" class="text-center">No alternative suggestions available</td></tr>');
            return;
        }

        $.each(alternatives, function(index, alt) {
            var row = '<tr>' +
                '<td>' + alt.original_imei + '</td>' +
                '<td>' + alt.alternative_imei + '</td>' +
                '<td>' + alt.model + '</td>' +
                '<td>' + alt.tray_location + '</td>' +
                '<td><button class="btn btn-info btn-sm use-alternative-btn" data-original="' + alt.original_imei + '" data-alternative="' + alt.alternative_imei + '">Use Alternative</button></td>' +
                '</tr>';

            tableBody.append(row);
        });

        // Add alternative button handlers
        $('.use-alternative-btn').click(function() {
            var originalImei = $(this).data('original');
            var alternativeImei = $(this).data('alternative');
            useAlternativeItem(originalImei, alternativeImei);
        });
    }

    function displayReservationStatus(statuses) {
        var tableBody = $('#reservation_status_table');
        tableBody.empty();

        if (statuses.length === 0) {
            tableBody.append('<tr><td colspan="5" class="text-center">No reservation information</td></tr>');
            return;
        }

        $.each(statuses, function(index, status) {
            var ageClass = status.age_hours > 24 ? 'label-danger' : 'label-info';
            var ageText = status.age_hours + ' hours';

            var row = '<tr>' +
                '<td>' + status.imei + '</td>' +
                '<td><span class="label ' + ageClass + '">' + status.reservation_status + '</span></td>' +
                '<td>' + (status.reserved_order_id || 'N/A') + '</td>' +
                '<td>' + ageText + '</td>' +
                '<td>' + (status.can_release ? '<button class="btn btn-warning btn-sm release-btn" data-imei="' + status.imei + '">Release</button>' : '') + '</td>' +
                '</tr>';

            tableBody.append(row);
        });

        // Add release button handlers
        $('.release-btn').click(function() {
            var imei = $(this).data('imei');
            releaseReservation(imei);
        });
    }

    function markItemAsPicked(imei) {
        // This would update the database to mark the item as picked
        console.log('Marking item as picked: ' + imei);
        alert('Item ' + imei + ' marked as picked');
    }

    function useAlternativeItem(originalImei, alternativeImei) {
        // This would update the sales order to use the alternative item
        console.log('Using alternative: ' + originalImei + ' -> ' + alternativeImei);
        alert('Using alternative item ' + alternativeImei + ' instead of ' + originalImei);
    }

    function releaseReservation(imei) {
        // This would release the reservation on the item
        console.log('Releasing reservation for: ' + imei);
        alert('Reservation released for item ' + imei);
    }
});
</script>

</body>
</html>