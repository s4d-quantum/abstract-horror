<?php
/**
 * Helper function to add log entries for Level 3 repairs
 * 
 * @param mysqli $conn Database connection
 * @param string $imei IMEI of the device
 * @param string $status Status of the repair
 * @param string $purchase_id Purchase ID of the device
 * @param string $operation Type of operation (BOOKED, UPDATED, COMPLETED, etc.)
 * @return bool True if log entry was created successfully, false otherwise
 */
function addRepairLogEntry($conn, $imei, $status, $purchase_id, $operation) {
    // Get current date in Y-m-d format
    $date = date('Y-m-d');
    
    // Get the current user ID from session
    $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0;
    
    // Create the log details string
    $details = "Status: $status";
    
    // Create log subject based on operation
    $subject = "LEVEL3 REPAIR $operation";
    
    // Insert log entry
    $insert_log_query = "
        INSERT INTO tbl_log (
            date, 
            item_code, 
            subject, 
            details, 
            ref, 
            user_id
        ) VALUES (
            '$date',
            '$imei',
            '$subject',
            '$details',
            '$purchase_id',
            $user_id
        )
    ";
    
    return mysqli_query($conn, $insert_log_query);
}
?>