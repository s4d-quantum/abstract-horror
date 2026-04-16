<?php
include '../../db_config.php';

// Start measuring execution time
$start_time = microtime(true);

// Get filters
$imei = isset($_GET['imei']) ? mysqli_real_escape_string($conn, $_GET['imei']) : '';
$status = isset($_GET['status']) ? mysqli_real_escape_string($conn, $_GET['status']) : '';
$show_active_only = isset($_GET['show_active_only']) && $_GET['show_active_only'] === 'true';
$show_completed_only = isset($_GET['show_completed_only']) && $_GET['show_completed_only'] === 'true';

// Add limit to avoid loading too much data at once - adjust to your needs
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$offset = ($page - 1) * $limit;

// Build status filter based on options
$status_filter = '';

// Filter by specific status if provided
if (!empty($status)) {
    $status_filter = " AND r.status = '$status'";
} else {
    // Otherwise filter by active or completed
    if ($show_active_only) {
        $status_filter = " AND r.status IN ('pending', 'in_progress', 'waiting_parts')";
    } elseif ($show_completed_only) {
        $status_filter = " AND r.status IN ('completed', 'unrepairable')";
    }
}

// First query: Get data from level3_repair table
$repairs_query = "
SELECT 
    r.date,
    r.item_imei,
    r.tray_id,
    r.manufacturer,
    r.model,
    s.name AS supplier_name,
    IFNULL(r.fault, 'Not specified') AS fault,
    r.status,
    1 AS priority -- For sorting by status priority
FROM level3_repair r
LEFT JOIN tbl_purchases p ON r.item_imei = p.item_imei
LEFT JOIN tbl_suppliers s ON p.supplier_id = s.supplier_id
WHERE 1=1 " . 
    ($imei ? " AND r.item_imei LIKE '%$imei%'" : "") . 
    $status_filter . "
ORDER BY 
CASE 
    WHEN r.status = 'pending' THEN 1
    WHEN r.status = 'in_progress' THEN 2
    WHEN r.status = 'waiting_parts' THEN 3
    WHEN r.status = 'completed' THEN 4
    WHEN r.status = 'unrepairable' THEN 5
    ELSE 6
END,
r.date DESC";

// Add LIMIT to query
$repairs_query .= " LIMIT $limit";

// Execute first query
$repairs_result = mysqli_query($conn, $repairs_query);
if (!$repairs_result) {
    die(json_encode(['error' => 'Error in repairs query: ' . mysqli_error($conn), 'query' => $repairs_query]));
}

// Process first query results
$all_data = [];
while ($row = mysqli_fetch_assoc($repairs_result)) {
    // Format the date once in PHP, not in SQL
    $row['date'] = date("d M Y, h:i A", strtotime($row['date']));
    $all_data[] = $row;
}

// Only run the second query if we're looking for active repairs that include pending
if ($show_active_only || (empty($status) && !$show_completed_only)) {
    // Second query: Get devices in level3 locations without repair records
    $devices_query = "
    SELECT
        p.date,
        i.item_imei,
        p.tray_id,
        c.title AS manufacturer,
        tc.item_details AS model,
        s.name AS supplier_name,
        'Not specified' AS fault,
        'pending' AS status,
        2 AS priority -- Lower priority than actual repair records
    FROM tbl_purchases p
    JOIN tbl_imei i ON p.item_imei = i.item_imei
    LEFT JOIN tbl_tac tc ON i.item_tac = tc.item_tac
    LEFT JOIN tbl_categories c ON tc.item_brand = c.category_id
    LEFT JOIN tbl_suppliers s ON p.supplier_id = s.supplier_id
    LEFT JOIN level3_repair lr ON i.item_imei = lr.item_imei
    WHERE p.tray_id LIKE 'level3%' 
    AND lr.item_imei IS NULL " .
        ($imei ? " AND i.item_imei LIKE '%$imei%'" : "") . "
    ORDER BY p.date DESC
    LIMIT $limit"; 

    // Execute second query
    $devices_result = mysqli_query($conn, $devices_query);
    if (!$devices_result) {
        die(json_encode(['error' => 'Error in devices query: ' . mysqli_error($conn), 'query' => $devices_query]));
    }

    // Process second query results
    while ($row = mysqli_fetch_assoc($devices_result)) {
        // Format the date
        $row['date'] = date("d M Y, h:i A", strtotime($row['date']));
        $all_data[] = $row;
    }
}

// Sort in PHP
usort($all_data, function($a, $b) {
    // First sort by priority
    if ($a['priority'] != $b['priority']) {
        return $a['priority'] - $b['priority'];
    }
    
    // Then by status according to the defined order
    $status_order = [
        'pending' => 1,
        'in_progress' => 2,
        'waiting_parts' => 3,
        'completed' => 4,
        'unrepairable' => 5
    ];
    
    $a_order = isset($status_order[$a['status']]) ? $status_order[$a['status']] : 6;
    $b_order = isset($status_order[$b['status']]) ? $status_order[$b['status']] : 6;
    
    if ($a_order != $b_order) {
        return $a_order - $b_order;
    }
    
    // Finally by date (reverse chronological)
    return strtotime($b['date']) - strtotime($a['date']);
});

// Implement pagination in PHP
$total_items = count($all_data);
$all_data = array_slice($all_data, $offset, $limit);

// Remove unnecessary fields before sending
foreach ($all_data as &$row) {
    // Remove the priority field used for sorting
    unset($row['priority']);
}

// Return data as JSON with pagination information and execution time
$execution_time = microtime(true) - $start_time;
echo json_encode([
    'data' => $all_data,
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total_items' => $total_items,
        'total_pages' => ceil($total_items / $limit)
    ],
    'execution_time' => round($execution_time * 1000), // in milliseconds
    'filters' => [
        'imei' => $imei,
        'status' => $status,
        'show_active_only' => $show_active_only,
        'show_completed_only' => $show_completed_only
    ]
]);
?>