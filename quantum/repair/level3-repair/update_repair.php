<?php
include '../../db_config.php';
include "../../authenticate.php";
include "repair_log_helper.php"; // Include our logging helper

// Check if form is submitted
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get form data
    $imei = mysqli_real_escape_string($conn, $_POST['imei']);
    $fault = mysqli_real_escape_string($conn, $_POST['fault']);
    $engineer_notes = mysqli_real_escape_string($conn, $_POST['engineer_notes']);
    $status = mysqli_real_escape_string($conn, $_POST['status']);
    $updated_at = date('Y-m-d H:i:s'); // Current date and time
    
    // Validate IMEI
    if (empty($imei)) {
        $_SESSION['error_message'] = "IMEI cannot be empty";
        header("Location: manage_repair.php");
        exit;
    }
    
    // Get purchase ID for logging
    $purchase_query = "SELECT purchase_id FROM tbl_purchases WHERE item_imei = '$imei'";
    $purchase_result = mysqli_query($conn, $purchase_query);
    $purchase_id = '';
    
    if ($purchase_result && mysqli_num_rows($purchase_result) > 0) {
        $purchase_row = mysqli_fetch_assoc($purchase_result);
        $purchase_id = $purchase_row['purchase_id'];
    }
    
    // Check if repair is being closed (completed or unrepairable)
    $closing_repair = ($status == 'completed' || $status == 'unrepairable');
    
    // Get the current repair information to check status
    $current_query = "SELECT status, tray_id FROM level3_repair WHERE item_imei = '$imei'";
    $current_result = mysqli_query($conn, $current_query);
    
    // Determine the operation type for logging
    $operation = "UPDATED";
    if ($closing_repair) {
        $operation = ($status == 'completed') ? "COMPLETED" : "UNREPAIRABLE";
    }
    
    if (mysqli_num_rows($current_result) > 0) {
        // Get the current repair info
        $current_repair = mysqli_fetch_assoc($current_result);
        $tray_id = $current_repair['tray_id'];
        $old_status = $current_repair['status'];
        
        // Check if this is a status change to completed/unrepairable
        $status_changed_to_closed = (
            ($current_repair['status'] != 'completed' && $current_repair['status'] != 'unrepairable') &&
            $closing_repair
        );
        
        // Update the repair record
        $update_query = "UPDATE level3_repair SET 
                            fault = '$fault', 
                            engineer_notes = '$engineer_notes', 
                            status = '$status', 
                            updated_at = '$updated_at'
                        WHERE item_imei = '$imei'";
                        
        if (mysqli_query($conn, $update_query)) {
            // Log the update
            addRepairLogEntry($conn, $imei, $status, $purchase_id, $operation);
            
            // If repair is being closed (completed or unrepairable), free up the location
            if ($status_changed_to_closed) {
                // Get current location for this device
                $get_location_query = "SELECT tray_id FROM tbl_purchases WHERE item_imei = '$imei'";
                $location_result = mysqli_query($conn, $get_location_query);
                $location_row = mysqli_fetch_assoc($location_result);
                $current_location = $location_row['tray_id'];
                
                // If device is in a level3 location, change it
                if (strpos($current_location, 'level3_') === 0) {
                    // Update the purchase record to mark it as completed repair
                    $update_location_query = "UPDATE tbl_purchases
                                            SET tray_id = " . ($status == 'completed' ? "'l3_complete'" : "'l3_fails'") . "
                                            WHERE item_imei = '$imei'";
                    
                    if (mysqli_query($conn, $update_location_query)) {
                        $_SESSION['success_message'] = "Repair marked as " . ucfirst($status) . " and location freed";
                    } else {
                        $_SESSION['error_message'] = "Repair status updated but error freeing location: " . mysqli_error($conn);
                    }
                } else {
                    $_SESSION['success_message'] = "Repair marked as " . ucfirst($status);
                }
            } else {
                $_SESSION['success_message'] = "Repair information updated successfully";
            }
        } else {
            $_SESSION['error_message'] = "Error updating repair: " . mysqli_error($conn);
        }
    } else {
        // If no existing repair record, get device information and create one
        $device_query = "
        SELECT 
            p.tray_id,
            c.title as manufacturer,
            tc.item_details as model
        FROM tbl_purchases p
        JOIN tbl_imei i ON p.item_imei = i.item_imei
        LEFT JOIN tbl_tac tc ON i.item_tac = tc.item_tac
        LEFT JOIN tbl_categories c ON tc.item_brand = c.category_id
        WHERE i.item_imei = '$imei' AND p.tray_id LIKE 'level3%'
        ";
        
        $device_result = mysqli_query($conn, $device_query);
        
        if (mysqli_num_rows($device_result) === 0) {
            $_SESSION['error_message'] = "Device not found in level3 repair inventory";
            header("Location: manage_repair.php");
            exit;
        }
        
        $device = mysqli_fetch_assoc($device_result);
        $tray_id = $device['tray_id'];
        $manufacturer = $device['manufacturer'];
        $model = $device['model'];
        
        // Insert new record
        $insert_query = "INSERT INTO level3_repair (
                            date, 
                            item_imei, 
                            manufacturer, 
                            model, 
                            tray_id, 
                            fault, 
                            engineer_notes, 
                            status,
                            updated_at
                        ) VALUES (
                            '$updated_at', 
                            '$imei', 
                            '$manufacturer', 
                            '$model', 
                            '$tray_id', 
                            '$fault', 
                            '$engineer_notes', 
                            '$status',
                            '$updated_at'
                        )";
                        
        if (mysqli_query($conn, $insert_query)) {
            // Log the new repair entry
            addRepairLogEntry($conn, $imei, $status, $purchase_id, "BOOKED");
            
            // If the new entry is immediately closed, free up the location
            if ($closing_repair) {
                $update_location_query = "UPDATE tbl_purchases
                                       SET tray_id = " . ($status == 'completed' ? "'l3_complete'" : "'l3_fails'") . "
                                       WHERE item_imei = '$imei' AND tray_id LIKE 'level3%'";
                
                if (mysqli_query($conn, $update_location_query)) {
                    $_SESSION['success_message'] = "Repair added and marked as " . ucfirst($status) . " and location freed";
                } else {
                    $_SESSION['error_message'] = "Repair added but error freeing location: " . mysqli_error($conn);
                }
            } else {
                $_SESSION['success_message'] = "Repair information added successfully";
            }
        } else {
            $_SESSION['error_message'] = "Error adding repair: " . mysqli_error($conn);
        }
    }
    
    // Redirect back to the view page
    header("Location: view_repair.php?imei=$imei");
    exit;
} else {
    // If accessed directly without form submission
    header("Location: manage_repair.php");
    exit;
}
?>