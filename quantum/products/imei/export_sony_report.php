<?php
include '../../db_config.php';
include 'includes/redis_helper.php';

// Set headers for download
header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=sony_stock_report_" . date("Y-m-d") . ".xls");
header("Pragma: no-cache");
header("Expires: 0");

// Output table headers
echo "<table border='1'>";
echo "<tr>
        <th>IMEI</th>
        <th>Manufacturer</th>
        <th>Model</th>
        <th>Color</th>
        <th>Grade</th>
        <th>Storage</th>
        <th>Purchase ID</th>
        <th>Fault</th>
      </tr>";

// Run query
$query = "
    SELECT 
        i.item_imei,
        cat.title AS manufacturer,
        tac.item_details AS model_name,
        i.item_color,
        g.title AS grade,
        gb.gb_value AS gb,
        i.purchase_id,
        fd.title AS fault
    FROM tbl_imei i
    JOIN tbl_tac tac ON i.item_tac = tac.item_tac
    JOIN tbl_categories cat ON tac.item_brand = cat.category_id
    LEFT JOIN tbl_grades g ON i.item_grade = g.grade_id
    LEFT JOIN tbl_gb gb ON i.item_gb = gb.id
    LEFT JOIN tbl_qc_imei_products qc ON qc.item_code = i.item_imei
    LEFT JOIN tbl_flash_descriptions fd ON qc.item_flashed = fd.desc_id
    WHERE cat.title = 'Sony' AND i.status = 1
";

$result = mysqli_query($conn, $query);

while ($row = mysqli_fetch_assoc($result)) {
    echo "<tr>";
    echo "<td>" . htmlspecialchars($row['item_imei']) . "</td>";
    echo "<td>" . htmlspecialchars($row['manufacturer']) . "</td>";
    echo "<td>" . htmlspecialchars($row['model_name']) . "</td>";
    echo "<td>" . htmlspecialchars($row['item_color']) . "</td>";
    echo "<td>" . htmlspecialchars($row['grade']) . "</td>";
    echo "<td>" . htmlspecialchars($row['gb']) . "</td>";
    echo "<td>" . htmlspecialchars($row['purchase_id']) . "</td>";
    echo "<td>" . htmlspecialchars($row['fault']) . "</td>";
    echo "</tr>";
}

echo "</table>";

// After processing is complete and data has been exported
// Clear the cache for products to ensure fresh data next time
clearProductCache();

exit;
