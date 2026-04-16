<?php
include '../../../db_config.php';
include '../../authenticate.php';

// Check if results data is available in session or passed via POST
if (!isset($_POST['color_check_results']) || empty($_POST['color_check_results'])) {
    die('No data available for export.');
}

// Decode the JSON results
$results = json_decode($_POST['color_check_results'], true);

if (!is_array($results)) {
    die('Invalid data format for export.');
}

// Set headers for Excel download
header("Content-Type: application/vnd.ms-excel");
header("Content-Disposition: attachment; filename=color_check_results_" . date("Y-m-d_H-i-s") . ".xls");
header("Pragma: no-cache");
header("Expires: 0");

// Output table headers
echo "<table border='1'>";
echo "<tr>";
echo "<th>IMEI</th>";
echo "<th>Color</th>";
echo "<th>Purchase Color</th>";
echo "<th>Model Info</th>";
echo "<th>Model Number</th>";
echo "<th>Source</th>";
echo "<th>Status</th>";
echo "<th>Notes</th>";
echo "<th>Details</th>";
echo "</tr>";

// Output data rows
foreach ($results as $row) {
    echo "<tr>";
    echo "<td>" . htmlspecialchars($row['imei'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($row['color'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($row['purchase_color'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($row['details']['model_info'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($row['details']['model_number'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($row['source'] ?? '') . "</td>";
    echo "<td>" . htmlspecialchars($row['status'] ?? '') . "</td>";
    echo "<td>";
    if ($row['error'] !== null) {
        echo htmlspecialchars($row['error']);
    } elseif (!empty($row['notes'])) {
        echo htmlspecialchars(implode(' | ', $row['notes']));
    }
    echo "</td>";
    echo "<td>";
    if (!empty($row['details'])) {
        $detailLines = [];
        $keysToShow = [
            'model_name' => 'Model Name',
            'model_number' => 'Model Number',
            'model_info' => 'Model Info',
            'warranty_status' => 'Warranty Status',
            'estimated_warranty_end_date' => 'Warranty End Date',
            'production_location' => 'Production Location',
            'production_date' => 'Production Date',
            'country_and_carrier' => 'Country / Carrier',
            'serial_number' => 'Serial Number',
        ];
        foreach ($keysToShow as $key => $label) {
            if (isset($row['details'][$key]) && $row['details'][$key] !== '') {
                $detailLines[] = $label . ': ' . $row['details'][$key];
            }
        }
        echo htmlspecialchars(implode("; ", $detailLines));
    }
    echo "</td>";
    echo "</tr>";
    
    // Add flush to handle large datasets
    if (ob_get_level()) {
        ob_flush();
    }
    flush();
}

echo "</table>";
?>