<?php
// Batch script to update delivery statuses for recent orders using API tracking
// Run via cron twice daily (9am and 5pm) for orders from yesterday onwards
// For orders before yesterday, assume delivered if not already marked

// Load environment variables
require_once __DIR__ . '/../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->safeLoad();

// Direct database connection to s4d_england_db for CLI execution
$host = $_ENV['DB_HOST'];
$port = $_ENV['DB_PORT'];
$username = $_ENV['DB_USERNAME'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_DATABASE'];

$conn = new mysqli($host, $username, $password, $database, $port);

if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error . "\n");
}

echo "Connected to database s4d_england_db at " . $host . ":" . $port . "\n";

// Set cutoff date: yesterday
$yesterday = date('Y-m-d', strtotime('-1 day'));

echo "Starting delivery status update at " . date('Y-m-d H:i:s') . "\n";

// Step 1: Handle old orders (before yesterday) - assume delivered
$old_orders_query = "UPDATE tbl_orders 
                     SET is_delivered = 1 
                     WHERE date < '$yesterday' 
                     AND is_delivered = 0 
                     AND delivery_company IN ('DHL', 'DPD') 
                     AND tracking_no != '' 
                     AND tracking_no IS NOT NULL";
$old_result = mysqli_query($conn, $old_orders_query);
if ($old_result) {
    $old_updated = mysqli_affected_rows($conn);
    echo "Updated $old_updated old orders to delivered.\n";
} else {
    echo "Error updating old orders: " . mysqli_error($conn) . "\n";
}

// Step 2: Process recent non-delivered orders (from yesterday onwards)
$recent_orders_query = "SELECT order_id, delivery_company, tracking_no 
                        FROM tbl_orders 
                        WHERE date >= '$yesterday' 
                        AND is_delivered = 0 
                        AND delivery_company IN ('DHL', 'DPD') 
                        AND tracking_no != '' 
                        AND tracking_no IS NOT NULL";
$recent_result = mysqli_query($conn, $recent_orders_query);

if (!$recent_result) {
    echo "Error fetching recent orders: " . mysqli_error($conn) . "\n";
    exit;
}

$recent_count = mysqli_num_rows($recent_result);
echo "Found $recent_count recent orders to check.\n";

$total_updated = 0;
while ($order = mysqli_fetch_assoc($recent_result)) {
    $order_id = $order['order_id'];
    $delivery_company = $order['delivery_company'];
    $tracking_no = $order['tracking_no'];
    
    echo "Checking order $order_id ($delivery_company: $tracking_no)\n";
    
    // Store original connection for restoration
    $original_conn = $GLOBALS['conn'] ?? null;
    
    // Set global connection for included file
    $GLOBALS['conn'] = $conn;
    
    // Include the fetch file directly to avoid HTTP call overhead in batch mode
    $_POST['order_id'] = $order_id;
    ob_start(); // Capture output
    include 'includes/fetch_delivery_status.php';
    $response = ob_get_clean();
    
    // Restore original connection if it existed
    if ($original_conn) {
        $GLOBALS['conn'] = $original_conn;
    }
    
    if (empty($response)) {
        echo "No response from fetch_delivery_status.php for order $order_id\n";
        continue;
    }
    
    $status_data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "Invalid JSON response for order $order_id: $response\n";
        continue;
    }
    
    if (isset($status_data['delivered']) && $status_data['delivered'] === true) {
        // Use order_id field for update as that's what the system uses
        $update_query = "UPDATE tbl_orders SET is_delivered = 1, delivery_updated_at = NOW() WHERE order_id = $order_id";
        $update_result = mysqli_query($conn, $update_query);
        if ($update_result) {
            $total_updated++;
            echo "Updated order $order_id to delivered.\n";
        } else {
            echo "Error updating order $order_id: " . mysqli_error($conn) . "\n";
        }
    } else {
        $status_msg = isset($status_data['status']) ? $status_data['status'] : (isset($status_data['error']) ? $status_data['error'] : 'Unknown');
        echo "Order $order_id not delivered yet. Status: $status_msg\n";
    }
}

echo "Batch update completed. Total recent orders updated: $total_updated\n";

// Optional: Log the run to database
$log_query = "INSERT INTO delivery_status_logs (run_date, old_updated, recent_updated) VALUES (NOW(), " . intval($old_updated ?? 0) . ", $total_updated) 
              ON DUPLICATE KEY UPDATE old_updated = VALUES(old_updated), recent_updated = VALUES(recent_updated)";
$result = mysqli_query($conn, $log_query);
if (!$result) {
    echo "Warning: Could not log batch run: " . mysqli_error($conn) . "\n";
}

// Note: Create table delivery_status_logs if needed:
/*
CREATE TABLE delivery_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_date DATETIME,
  old_updated INT DEFAULT 0,
  recent_updated INT DEFAULT 0,
  UNIQUE KEY unique_run (run_date)
);
*/
?>