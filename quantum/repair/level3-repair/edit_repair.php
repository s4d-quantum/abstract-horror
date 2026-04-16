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
    // Set default values for new repair records
    $repair['status'] = 'pending';
    $repair['fault'] = '';
    $repair['engineer_notes'] = '';
} else {
    $repair = mysqli_fetch_assoc($result);
}

// For debugging - remove in production
// echo "<pre>"; print_r($repair); echo "</pre>";
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <!-- Content Header (Page header) -->
  <section class="content-header">
    <h1>
      Edit Level 3 Repair
      <small>Update repair details</small>
    </h1>
    <ol class="breadcrumb">
      <li><a href="<?php echo $global_url; ?>dashboard"><i class="fa fa-dashboard"></i> Home</a></li>
      <li><a href="<?php echo $global_url; ?>repair/repair_menu.php">Repair Menu</a></li>
      <li><a href="manage_repair.php">Level 3 Repairs</a></li>
      <li class="active">Edit Repair</li>
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
      <div class="col-md-12">
        <div class="box box-primary">
          <div class="box-header with-border">
            <h3 class="box-title">Edit Repair Details</h3>
          </div>
          <!-- /.box-header -->
          
          <!-- form start -->
          <form role="form" action="update_repair.php" method="post">
            <input type="hidden" name="imei" value="<?php echo $imei; ?>">
            <input type="hidden" name="purchase_id" value="<?php echo isset($repair['purchase_id']) ? $repair['purchase_id'] : ''; ?>">
            
            <div class="box-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label>IMEI Number</label>
                    <p class="form-control-static">
                      <a href="<?php echo $global_url; ?>products/imei/item_details.php?item_code=<?php echo $imei; ?>" target="_blank">
                        <?php echo $imei; ?> <i class="fa fa-external-link"></i>
                      </a>
                    </p>
                  </div>
                  
                  <div class="form-group">
                    <label>Purchase ID</label>
                    <p class="form-control-static">
                      <?php if (!empty($repair['purchase_id'])): ?>
                        <a href="<?php echo $global_url; ?>purchases/imei_purchases/edit_purchase.php?pur_id=<?php echo $repair['purchase_id']; ?>" target="_blank">
                          <?php echo $repair['purchase_id']; ?> <i class="fa fa-external-link"></i>
                        </a>
                      <?php else: ?>
                        Not available
                      <?php endif; ?>
                    </p>
                  </div>
                  
                  <div class="form-group">
                    <label>Manufacturer</label>
                    <p class="form-control-static"><?php echo isset($repair['manufacturer_name']) ? $repair['manufacturer_name'] : ''; ?></p>
                  </div>
                  
                  <div class="form-group">
                    <label>Model</label>
                    <p class="form-control-static"><?php echo isset($repair['model_name']) ? $repair['model_name'] : ''; ?></p>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Location</label>
                    <p class="form-control-static"><?php echo isset($repair['tray_id']) ? $repair['tray_id'] : ''; ?></p>
                  </div>
                  
                  <div class="form-group">
                    <label>Supplier</label>
                    <p class="form-control-static"><?php echo (isset($repair['supplier_name']) && !empty($repair['supplier_name'])) ? $repair['supplier_name'] : 'Unknown'; ?></p>
                  </div>
                  
                  <div class="form-group">
                    <label for="status">Status</label>
                    <select class="form-control" id="status" name="status">
                      <option value="pending" <?php echo (isset($repair['status']) && $repair['status'] == 'pending') ? 'selected' : ''; ?>>Pending</option>
                      <option value="in_progress" <?php echo (isset($repair['status']) && $repair['status'] == 'in_progress') ? 'selected' : ''; ?>>In Progress</option>
                      <option value="waiting_parts" <?php echo (isset($repair['status']) && $repair['status'] == 'waiting_parts') ? 'selected' : ''; ?>>Waiting for Parts</option>
                      <option value="completed" <?php echo (isset($repair['status']) && $repair['status'] == 'completed') ? 'selected' : ''; ?>>Completed</option>
                      <option value="unrepairable" <?php echo (isset($repair['status']) && $repair['status'] == 'unrepairable') ? 'selected' : ''; ?>>Unrepairable</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="fault">Fault Description <span class="text-danger">*</span></label>
                <textarea class="form-control" id="fault" name="fault" rows="3" required><?php echo isset($repair['fault']) ? $repair['fault'] : ''; ?></textarea>
              </div>
              
              <div class="form-group">
                <label for="engineer_notes">Engineer Notes</label>
                <textarea class="form-control" id="engineer_notes" name="engineer_notes" rows="3"><?php echo isset($repair['engineer_notes']) ? $repair['engineer_notes'] : ''; ?></textarea>
              </div>
            </div>
            <!-- /.box-body -->

            <div class="box-footer">
              <button type="submit" class="btn btn-primary">Update Repair</button>
              <a href="view_repair.php?imei=<?php echo $imei; ?>" class="btn btn-default">Cancel</a>
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

</body>
</html>