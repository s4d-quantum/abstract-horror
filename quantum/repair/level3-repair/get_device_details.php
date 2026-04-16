<?php
include '../../db_config.php';

if (isset($_POST['tac'])) {
    $tac = mysqli_real_escape_string($conn, $_POST['tac']);
    
    // Query to get device details from tac code
    $query = "
    SELECT 
        c.title as manufacturer,
        tc.item_details as model
    FROM tbl_tac tc
    LEFT JOIN tbl_categories c ON tc.item_brand = c.category_id
    WHERE tc.item_tac LIKE '{$tac}%'
    LIMIT 1
    ";
    
    $result = mysqli_query($conn, $query);
    
    if ($result && mysqli_num_rows($result) > 0) {
        $device = mysqli_fetch_assoc($result);
        echo json_encode([
            'success' => true,
            'manufacturer' => $device['manufacturer'],
            'model' => $device['model']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Device not found'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'No TAC code provided'
    ]);
}
?>