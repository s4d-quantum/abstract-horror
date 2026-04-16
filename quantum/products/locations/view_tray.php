<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php include "../../header.php"; ?>

<?php

// Function to convert grade integer to letter
function getGradeLetter($gradeValue) {
    $gradeMapping = [
        '0' => 'Ungraded',
        '1' => 'A',
        '2' => 'B',
        '3' => 'C',
        '4' => 'D',
        '5' => 'E',
        '6' => 'F'
    ];
    
    // Handle NULL values or empty values
    if ($gradeValue === null || $gradeValue === '' || $gradeValue === 'NULL') {
        return 'Ungraded';
    }
    
    return isset($gradeMapping[$gradeValue]) ? $gradeMapping[$gradeValue] : $gradeValue;
}
?>
<?php
$tray_id = isset($_GET['tray_id']) ? mysqli_real_escape_string($conn, $_GET['tray_id']) : '';
if ($tray_id === '') {
  header("Location: manage_locations.php");
  exit;
}

$items = mysqli_query($conn, "
  SELECT 
    i.item_imei,
    c.title AS manufacturer,
    tc.item_details AS model,
    i.item_gb AS storage,
    i.item_color AS color,
    i.item_grade AS grade,
    s.name AS supplier
  FROM tbl_purchases p
  JOIN tbl_imei i ON i.item_imei = p.item_imei
  LEFT JOIN tbl_tac tc ON tc.item_tac = i.item_tac
  LEFT JOIN tbl_categories c ON c.category_id = tc.item_brand
  LEFT JOIN tbl_suppliers s ON s.supplier_id = p.supplier_id
  WHERE i.status = 1
    AND p.purchase_return = 0
    AND p.tray_id = '".$tray_id."'
  ORDER BY i.id DESC
") or die('Error:: '.mysqli_error($conn));

// Fetch lock status
$tray_row = mysqli_query($conn, "SELECT tray_id, COALESCE(locked,0) AS locked FROM tbl_trays WHERE tray_id='".$tray_id."' LIMIT 1");
$tray = $tray_row ? mysqli_fetch_assoc($tray_row) : ['tray_id' => $tray_id, 'locked' => 0];
?>

<div class="content-wrapper">
  <section class="content-header">
    <h1>Tray <?php echo htmlspecialchars($tray['tray_id']); ?> <?php echo $tray['locked'] ? '(Locked)' : ''; ?></h1>
  </section>
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <div class="box">
          <div class="box-header">
            <a href="manage_locations.php" class="btn btn-default">Back</a>
          </div>
          <div class="box-body">
            <table id="tray-items" class="table table-bordered table-striped">
              <thead>
                <tr>
                  <th>IMEI</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Storage</th>
                  <th>Color</th>
                  <th>Grade</th>
                  <th>Supplier</th>
                </tr>
              </thead>
              <tbody>
                <?php while($row = mysqli_fetch_assoc($items)): ?>
                  <tr>
                    <td><?php echo htmlspecialchars($row['item_imei']); ?></td>
                    <td><?php echo htmlspecialchars($row['manufacturer']); ?></td>
                    <td><?php echo htmlspecialchars($row['model']); ?></td>
                    <td><?php echo htmlspecialchars($row['storage']); ?></td>
                    <td><?php echo htmlspecialchars($row['color']); ?></td>
                    <td><?php echo htmlspecialchars(getGradeLetter($row['grade'])); ?></td>
                    <td><?php echo htmlspecialchars($row['supplier']); ?></td>
                  </tr>
                <?php endwhile; ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<?php include $global_url."footer.php";?>
<script>
  $('#tray-items').dataTable();
</script>
</body>
</html>

