<?php
include '../../db_config.php';

// Test query to check for duplicates
$supplier = 'SUP-100';

echo "<h2>Testing DVB Ltd Duplicate Records</h2>";

// Check 1: Count records in tbl_imei
$query1 = "SELECT COUNT(*) as total FROM tbl_imei";
$result1 = mysqli_query($conn, $query1);
$row1 = mysqli_fetch_assoc($result1);
echo "<p>Total records in tbl_imei: " . $row1['total'] . "</p>";

// Check 2: Count unique IMEIs in tbl_imei
$query2 = "SELECT COUNT(DISTINCT item_imei) as unique_imeis FROM tbl_imei";
$result2 = mysqli_query($conn, $query2);
$row2 = mysqli_fetch_assoc($result2);
echo "<p>Unique IMEIs in tbl_imei: " . $row2['unique_imeis'] . "</p>";

// Check 3: Find duplicate IMEIs in tbl_imei
$query3 = "SELECT item_imei, COUNT(*) as count
           FROM tbl_imei
           GROUP BY item_imei
           HAVING COUNT(*) > 1
           LIMIT 10";
$result3 = mysqli_query($conn, $query3);
echo "<h3>Duplicate IMEIs in tbl_imei:</h3>";
echo "<table border='1'><tr><th>IMEI</th><th>Count</th></tr>";
while($row3 = mysqli_fetch_assoc($result3)){
    echo "<tr><td>{$row3['item_imei']}</td><td>{$row3['count']}</td></tr>";
}
echo "</table>";

// Check 4: Sample DVB data with joins
$query4 = "
SELECT
    i.id as imei_id,
    i.item_imei,
    pr.purchase_id,
    pr.supplier_id,
    pr.tray_id,
    i.item_color,
    tc.item_details
FROM tbl_imei i
INNER JOIN tbl_tac as tc on i.item_tac = tc.item_tac
INNER JOIN tbl_purchases as pr ON i.item_imei = pr.item_imei
WHERE pr.supplier_id = '$supplier'
  AND i.status = 1
  AND pr.purchase_return = 0
ORDER BY i.item_imei, pr.purchase_id
LIMIT 20";

$result4 = mysqli_query($conn, $query4);
echo "<h3>Sample DVB Ltd records with joins:</h3>";
echo "<table border='1'><tr><th>IMEI ID</th><th>IMEI</th><th>Purchase ID</th><th>Tray</th><th>Color</th><th>Model</th></tr>";
while($row4 = mysqli_fetch_assoc($result4)){
    echo "<tr>";
    echo "<td>{$row4['imei_id']}</td>";
    echo "<td>{$row4['item_imei']}</td>";
    echo "<td>{$row4['purchase_id']}</td>";
    echo "<td>{$row4['tray_id']}</td>";
    echo "<td>{$row4['item_color']}</td>";
    echo "<td>{$row4['item_details']}</td>";
    echo "</tr>";
}
echo "</table>";
?>
