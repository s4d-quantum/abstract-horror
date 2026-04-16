<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php include "../../header.php"; ?>

<?php 
// Fetch only trays that actually have in-stock, non-returned items
$trays = mysqli_query($conn, "
  SELECT 
    t.tray_id,
    COALESCE(t.locked, 0) AS locked,
    c.qty
  FROM tbl_trays t
  JOIN (
    SELECT p.tray_id, COUNT(*) AS qty
    FROM tbl_purchases p
    JOIN tbl_imei i ON i.item_imei = p.item_imei
    WHERE i.status = 1 AND p.purchase_return = 0
    GROUP BY p.tray_id
  ) c ON c.tray_id = t.tray_id
  ORDER BY t.tray_id
") or die('Error:: '.mysqli_error($conn));
?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">

  <!-- Main content -->
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <div class="box">
                <div class="box-header">
                  <h3 class="box-title">Trays By Location</h3>
                </div>
                <div class="box-body">
                  <table id="locations-table" class="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>Tray</th>
                        <th>Quantity</th>
                        <th>Locked?</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <?php while($row = mysqli_fetch_assoc($trays)): ?>
                        <tr>
                          <td><?php echo htmlspecialchars($row['tray_id']); ?></td>
                          <td><?php echo intval($row['qty']); ?></td>
                          <td><?php echo ($row['locked'] ? 'Yes' : 'No'); ?></td>
                          <td>
                            <div class="btn-group">
                              <a href="view_tray.php?tray_id=<?php echo urlencode($row['tray_id']); ?>" class="btn btn-primary">View</a>
                              <form action="lock_tray.php" method="post" style="display:inline-block;margin-left:5px;">
                                <input type="hidden" name="tray_id" value="<?php echo htmlspecialchars($row['tray_id']); ?>" />
                                <input type="hidden" name="locked" value="1" />
                                <button type="submit" class="btn btn-warning" <?php echo $row['locked'] ? 'disabled' : ''; ?>>Lock</button>
                              </form>
                              <form action="lock_tray.php" method="post" style="display:inline-block;margin-left:5px;">
                                <input type="hidden" name="tray_id" value="<?php echo htmlspecialchars($row['tray_id']); ?>" />
                                <input type="hidden" name="locked" value="0" />
                                <button type="submit" class="btn btn-success" <?php echo !$row['locked'] ? 'disabled' : ''; ?>>Unlock</button>
                              </form>
                            </div>
                          </td>
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
    </div>
  </section>
</div>

<?php include $global_url."footer.php";?>
<script>
  $('#locations-table').dataTable();
  </script>
</body>
</html>
