<?php
include '../../db_config.php';
include "../../authenticate.php";
include "repair_log_helper.php"; // Include our logging helper

// Check if form is submitted
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get form data
    $imei = mysqli_real_escape_string($conn, $_POST['imei']);
    $manufacturer = mysqli_real_escape_string($conn, $_POST['manufacturer']);
    $model = mysqli_real_escape_string($conn, $_POST['model']);
    $tray_id = mysqli_real_escape_string($conn, $_POST['tray_id']);
    $fault = mysqli_real_escape_string($conn, $_POST['fault']);
    $status = mysqli_real_escape_string($conn, $_POST['status']);
    $engineer_notes = mysqli_real_escape_string($conn, $_POST['engineer_notes']);
    $current_date = date('Y-m-d H:i:s'); // Get current date and time
    
    // Validate IMEI (basic validation)
    if (empty($imei) || strlen($imei) < 8) {
        $_SESSION['error_message'] = "Invalid IMEI number";
        header("Location: book_repair.php");
        exit;
    }
    
    // Check if IMEI exists in tbl_imei
    $check_query = "SELECT * FROM tbl_imei WHERE item_imei = '$imei'";
    $check_result = mysqli_query($conn, $check_query);
    
    if (mysqli_num_rows($check_result) === 0) {
        $_SESSION['error_message'] = "IMEI $imei not found in inventory";
        header("Location: book_repair.php");
        exit;
    }
    
    // Check if IMEI already exists in level3_repair table with active status
    $check_repair_query = "SELECT * FROM level3_repair WHERE item_imei = '$imei' AND (status != 'completed' AND status != 'unrepairable')";
    $check_repair_result = mysqli_query($conn, $check_repair_query);
    
    if (mysqli_num_rows($check_repair_result) > 0) {
        $_SESSION['error_message'] = "This device is already in the Level 3 repair system";
        header("Location: book_repair.php");
        exit;
    }
    
    // Improved location validation - check if location is already occupied by an active repair
    $check_location_query = "
        SELECT p.item_imei 
        FROM tbl_purchases p
        LEFT JOIN level3_repair l ON p.item_imei = l.item_imei
        WHERE p.tray_id = '$tray_id' 
        AND (l.status IS NULL OR (l.status != 'completed' AND l.status != 'unrepairable'))
    ";
    $check_location_result = mysqli_query($conn, $check_location_query);
    
    if (mysqli_num_rows($check_location_result) > 0) {
        $occupied_device = mysqli_fetch_assoc($check_location_result);
        if ($occupied_device['item_imei'] != $imei) {
            $_SESSION['error_message'] = "Location $tray_id is already occupied by another device";
            header("Location: book_repair.php");
            exit;
        }
    }
    
    // Get purchase ID for logging
    $purchase_query = "SELECT purchase_id FROM tbl_purchases WHERE item_imei = '$imei'";
    $purchase_result = mysqli_query($conn, $purchase_query);
    $purchase_id = '';
    
    if ($purchase_result && mysqli_num_rows($purchase_result) > 0) {
        $purchase_row = mysqli_fetch_assoc($purchase_result);
        $purchase_id = $purchase_row['purchase_id'];
    }
    
    // Check if the device previously had a completed/unrepairable repair
    $previous_repair_query = "SELECT * FROM level3_repair WHERE item_imei = '$imei' AND (status = 'completed' OR status = 'unrepairable') ORDER BY date DESC LIMIT 1";
    $previous_repair_result = mysqli_query($conn, $previous_repair_query);
    
    if (mysqli_num_rows($previous_repair_result) > 0) {
        // Device has a previous completed/unrepairable repair - update the record
        $update_query = "
            UPDATE level3_repair 
            SET 
                date = '$current_date',
                manufacturer = '$manufacturer',
                model = '$model',
                tray_id = '$tray_id',
                fault = '$fault',
                status = '$status',
                engineer_notes = '$engineer_notes',
                updated_at = '$current_date'
            WHERE item_imei = '$imei'
            ORDER BY date DESC
            LIMIT 1
        ";
        
        if (mysqli_query($conn, $update_query)) {
            // Update tray_id in tbl_purchases if needed
            $update_tray_query = "UPDATE tbl_purchases SET tray_id = '$tray_id' WHERE item_imei = '$imei'";
            mysqli_query($conn, $update_tray_query);
            
            // Log the booking with re-entry notation
            addRepairLogEntry($conn, $imei, $status, $purchase_id, "REBOOKED");
            
            $_SESSION['success_message'] = "Device successfully re-entered into Level 3 Repair";
            header("Location: manage_repair.php");
        } else {
            $_SESSION['error_message'] = "Error updating repair record: " . mysqli_error($conn);
            header("Location: book_repair.php");
        }
    } else {
        // Insert data into level3_repair table with an explicit date value
        $insert_query = "INSERT INTO level3_repair (date, item_imei, manufacturer, model, tray_id, fault, status, engineer_notes, updated_at)
                        VALUES ('$current_date', '$imei', '$manufacturer', '$model', '$tray_id', '$fault', '$status', '$engineer_notes', '$current_date')";
        
        if (mysqli_query($conn, $insert_query)) {
            // Update tray_id in tbl_purchases if needed
            $update_tray_query = "UPDATE tbl_purchases SET tray_id = '$tray_id' WHERE item_imei = '$imei'";
            mysqli_query($conn, $update_tray_query);
            
            // Log the booking
            addRepairLogEntry($conn, $imei, $status, $purchase_id, "BOOKED");
            
            $_SESSION['success_message'] = "Device successfully booked into Level 3 Repair";
            header("Location: manage_repair.php");
        } else {
            $_SESSION['error_message'] = "Error booking repair: " . mysqli_error($conn);
            header("Location: book_repair.php");
        }
    }
    
    exit;
} else {
    // If accessed directly without form submission
    header("Location: manage_repair.php");
    exit;
}
?>