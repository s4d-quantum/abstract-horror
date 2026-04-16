<?php $global_url="../../"; ?>
<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php include "../../header.php" ?>

<?php
// Get IMEI from the query string
$imei = isset($_GET['imei']) ? mysqli_real_escape_string($conn, $_GET['imei']) : '';

// If no IMEI is provided, redirect back to the manage repairs page
if (empty($imei)) {
    $_SESSION['error_message'] = "No IMEI provided";
    header("Location: manage_repair.php");
    exit;
}

// Query to get the repair details including purchase ID
$query = "
SELECT 
    l3r.*,
    COALESCE(l3r.manufacturer, c.title) as manufacturer_name,
    COALESCE(l3r.model, tc.item_details) as model_name,
    s.name as supplier_name,
    p.purchase_id
FROM level3_repair l3r
LEFT JOIN tbl_imei i ON l3r.item_imei = i.item_imei
LEFT JOIN tbl_tac tc ON i.item_tac = tc.item_tac
LEFT JOIN tbl_categories c ON tc.item_brand = c.category_id
LEFT JOIN tbl_purchases p ON l3r.item_imei = p.item_imei
LEFT JOIN tbl_suppliers s ON p.supplier_id = s.supplier_id
WHERE l3r.item_imei = '$imei'
";

$result = mysqli_query($conn, $query);

// If no record found, check if it's in the inventory but not in level3_repair
if (mysqli_num_rows($result) === 0) {
    $inventory_query = "
    SELECT 
        p.date, 
        i.item_imei, 
        p.tray_id, 
        c.title as manufacturer_name, 
        tc.item_details as model_name,
        s.name as supplier_name,
        p.purchase_id
    FROM tbl_purchases p
    LEFT JOIN tbl_imei i ON p.item_imei = i.item_imei
    LEFT JOIN tbl_tac tc ON i.item_tac = tc.item_tac
    LEFT JOIN tbl_categories c ON tc.item_brand = c.category_id
    LEFT JOIN tbl_suppliers s ON p.supplier_id = s.supplier_id
    WHERE i.item_imei = '$imei' AND p.tray_id LIKE 'level3%'
    ";
    
    $inventory_result = mysqli_query($conn, $inventory_query);
    
    if (mysqli_num_rows($inventory_result) === 0) {
        $_SESSION['error_message'] = "Device with IMEI $imei not found";
        header("Location: manage_repair.php");
        exit;
    }
    
    $repair = mysqli_fetch_assoc($inventory_result);
    $repair['status'] = 'pending';
    $repair['fault'] = 'Not specified';
    $repair['engineer_notes'] = '';
} else {
    $repair = mysqli_fetch_assoc($result);
}
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      View Level 3 Repair
      <small>Device details</small>
    </h1>
    <ol class="breadcrumb">
      <li><a href="<?php echo $global_url; ?>dashboard"><i class="fa fa-dashboard"></i> Home</a></li>
      <li><a href="<?php echo $global_url; ?>repair/repair_menu.php">Repair Menu</a></li>
      <li><a href="manage_repair.php">Level 3 Repairs</a></li>
      <li class="active">View Repair</li>
    </ol>
  </section>

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <div class="col-md-12">
        <div class="box box-info">
          <div class="box-header with-border">
            <h3 class="box-title">Repair Information</h3>
            <div class="box-tools pull-right">
              <a href="edit_repair.php?imei=<?php echo $imei; ?>" class="btn btn-primary btn-sm">
                <i class="fa fa-edit"></i> Edit Repair
              </a>
            </div>
          </div>
          <!-- /.box-header -->
          <div class="box-body">
            <div class="row">
              <div class="col-md-6">
                <table class="table table-striped">
                  <tr>
                    <th style="width:150px;">IMEI</th>
                    <td>
                      <a href="<?php echo $global_url; ?>products/imei/item_details.php?item_code=<?php echo $repair['item_imei']; ?>" target="_blank">
                        <?php echo $repair['item_imei']; ?> <i class="fa fa-external-link"></i>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <th>Purchase ID</th>
                    <td>
                      <?php if (!empty($repair['purchase_id'])): ?>
                        <a href="<?php echo $global_url; ?>purchases/imei_purchases/edit_purchase.php?pur_id=<?php echo $repair['purchase_id']; ?>" target="_blank">
                          <?php echo $repair['purchase_id']; ?> <i class="fa fa-external-link"></i>
                        </a>
                      <?php else: ?>
                        Not available
                      <?php endif; ?>
                    </td>
                  </tr>
                  <tr>
                    <th>Date Booked</th>
                    <td><?php echo date("d M Y, h:i A", strtotime($repair['date'])); ?></td>
                  </tr>
                  <tr>
                    <th>Manufacturer</th>
                    <td><?php echo $repair['manufacturer_name']; ?></td>
                  </tr>
                  <tr>
                    <th>Model</th>
                    <td><?php echo $repair['model_name']; ?></td>
                  </tr>
                </table>
              </div>
              <div class="col-md-6">
                <table class="table table-striped">
                  <tr>
                    <th style="width:150px;">Location</th>
                    <td><?php echo $repair['tray_id']; ?></td>
                  </tr>
                  <tr>
                    <th>Supplier</th>
                    <td><?php echo empty($repair['supplier_name']) ? 'Unknown' : $repair['supplier_name']; ?></td>
                  </tr>
                  <tr>
                    <th>Status</th>
                    <td>
                      <?php 
                        $status_class = '';
                        switch($repair['status']) {
                            case 'pending':
                                $status_class = 'label-warning';
                                break;
                            case 'in_progress':
                                $status_class = 'label-info';
                                break;
                            case 'waiting_parts':
                                $status_class = 'label-primary';
                                break;
                            case 'completed':
                                $status_class = 'label-success';
                                break;
                            case 'unrepairable':
                                $status_class = 'label-danger';
                                break;
                            default:
                                $status_class = 'label-default';
                        }
                        echo '<span class="label ' . $status_class . '">' . ucfirst($repair['status']) . '</span>';
                      ?>
                    </td>
                  </tr>
                  <tr>
                    <th>Last Updated</th>
                    <td><?php echo !empty($repair['updated_at']) ? date("d M Y, h:i A", strtotime($repair['updated_at'])) : 'Not updated yet'; ?></td>
                  </tr>
                </table>
              </div>
            </div>
            
            <div class="row">
              <div class="col-md-12">
                <div class="form-group">
                  <label>Fault Description</label>
                  <div class="well well-sm"><?php echo nl2br($repair['fault']); ?></div>
                </div>
                
                <div class="form-group">
                  <label>Engineer Notes</label>
                  <div class="well well-sm"><?php echo empty($repair['engineer_notes']) ? 'No notes added yet' : nl2br($repair['engineer_notes']); ?></div>
                </div>
              </div>
            </div>
          </div>
          <!-- /.box-body -->
          <div class="box-footer">
            <a href="manage_repair.php" class="btn btn-default">Back to Repairs List</a>
          </div>
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

</body>
</html>