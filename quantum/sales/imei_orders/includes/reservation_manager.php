<?php include '../../../db_config.php';  ?>

<?php

// Reservation Management System
// Handles auto-release of stale reservations and provides alternative suggestions

class ReservationManager {
    private $conn;
    private $reservation_timeout_hours = 24; // Auto-release after 24 hours

    public function __construct($conn) {
        $this->conn = $conn;
    }

    /**
     * Check for and release stale reservations
     */
    public function releaseStaleReservations() {
        $timeout_time = date('Y-m-d H:i:s', strtotime("-{$this->reservation_timeout_hours} hours"));

        // Find stale reservations (not completed, older than timeout)
        $query = "
        SELECT order_id, item_code
        FROM tbl_imei_sales_orders
        WHERE is_completed = 0
        AND date < '".$timeout_time."'
        ";

        $result = mysqli_query($this->conn, $query);

        $released_count = 0;
        while ($row = mysqli_fetch_assoc($result)) {
            // Release this reservation
            $release_query = "
            DELETE FROM tbl_imei_sales_orders
            WHERE order_id = ".$row['order_id']."
            AND item_code = '".$row['item_code']."'
            ";

            if (mysqli_query($this->conn, $release_query)) {
                $released_count++;

                // Log the release
                $log_query = "
                INSERT INTO tbl_log (ref, subject, details, date, user_id, item_code)
                VALUES (
                    'AUTO-RELEASE',
                    'STALE RESERVATION RELEASED',
                    'Reserved for more than {$this->reservation_timeout_hours} hours',
                    '".date('Y-m-d')."',
                    0,
                    '".$row['item_code']."'
                )
                ";
                mysqli_query($this->conn, $log_query);
            }
        }

        return $released_count;
    }

    /**
     * Find alternative units for a reserved item
     */
    public function findAlternativeUnits($original_imei) {
        // Get the original item's specifications
        $original_query = "
        SELECT
            im.item_color, im.oem_color, im.item_gb, im.item_grade,
            tc.item_brand, tc.item_details,
            pr.supplier_id
        FROM tbl_imei im
        JOIN tbl_tac tc ON tc.item_tac = im.item_tac
        JOIN tbl_purchases pr ON pr.item_imei = im.item_imei
        WHERE im.item_imei = '".$original_imei."'
        ";

        $original_result = mysqli_query($this->conn, $original_query);
        if (!$original_result || mysqli_num_rows($original_result) == 0) {
            return array();
        }

        $original_specs = mysqli_fetch_assoc($original_result);

        // Find alternative units with same specs, not reserved
        $alternative_query = "
        SELECT im.item_imei, pr.tray_id
        FROM tbl_imei im
        JOIN tbl_tac tc ON tc.item_tac = im.item_tac
        JOIN tbl_purchases pr ON pr.item_imei = im.item_imei
        LEFT JOIN tbl_trays t ON t.tray_id = pr.tray_id
        WHERE
            -- Same specifications
            im.item_color = '".$original_specs['item_color']."'
            AND im.oem_color = '".$original_specs['oem_color']."'
            AND im.item_gb = '".$original_specs['item_gb']."'
            AND im.item_grade = ".$original_specs['item_grade']."
            AND tc.item_brand = '".$original_specs['item_brand']."'
            AND tc.item_details = '".$original_specs['item_details']."'
            AND pr.supplier_id = '".$original_specs['supplier_id']."'
            -- Not the original item
            AND im.item_imei != '".$original_imei."'
            -- Not reserved
            AND NOT EXISTS(
                SELECT 1 FROM tbl_imei_sales_orders
                WHERE item_code = im.item_imei AND is_completed = 0
            )
            -- Available for selection
            AND im.status = 1
            AND pr.purchase_return = 0
            AND COALESCE(t.locked, 0) = 0
            -- QC requirements met
            AND (
                (pr.qc_required = 0) OR
                (pr.qc_required = 1 AND pr.qc_completed = 1 AND
                 EXISTS(SELECT 1 FROM tbl_qc_imei_products WHERE
                     item_cosmetic_passed = 1 AND item_functional_passed = 1 AND
                     item_code = im.item_imei AND purchase_id = pr.purchase_id)
                )
            )
        LIMIT 5
        ";

        $alternative_result = mysqli_query($this->conn, $alternative_query);
        $alternatives = array();

        while ($row = mysqli_fetch_assoc($alternative_result)) {
            $alternatives[] = array(
                'imei' => $row['item_imei'],
                'tray_id' => $row['tray_id']
            );
        }

        return $alternatives;
    }

    /**
     * Get reservation statistics
     */
    public function getReservationStats() {
        // Count active reservations
        $active_query = "
        SELECT COUNT(*) as active_reservations
        FROM tbl_imei_sales_orders
        WHERE is_completed = 0
        ";

        $active_result = mysqli_query($this->conn, $active_query);
        $active_count = mysqli_fetch_assoc($active_result)['active_reservations'];

        // Count stale reservations (older than timeout)
        $timeout_time = date('Y-m-d H:i:s', strtotime("-{$this->reservation_timeout_hours} hours"));
        $stale_query = "
        SELECT COUNT(*) as stale_reservations
        FROM tbl_imei_sales_orders
        WHERE is_completed = 0
        AND date < '".$timeout_time."'
        ";

        $stale_result = mysqli_query($this->conn, $stale_query);
        $stale_count = mysqli_fetch_assoc($stale_result)['stale_reservations'];

        return array(
            'active_reservations' => $active_count,
            'stale_reservations' => $stale_count,
            'reservation_timeout_hours' => $this->reservation_timeout_hours
        );
    }
}

// Handle API requests
if (isset($_GET['action'])) {
    $manager = new ReservationManager($conn);

    switch ($_GET['action']) {
        case 'release_stale':
            $released = $manager->releaseStaleReservations();
            echo json_encode(array(
                'success' => true,
                'released_count' => $released,
                'message' => "Released $released stale reservations"
            ));
            break;

        case 'find_alternatives':
            $imei = isset($_GET['imei']) ? $_GET['imei'] : '';
            $alternatives = $manager->findAlternativeUnits($imei);
            echo json_encode(array(
                'success' => true,
                'alternatives' => $alternatives,
                'count' => count($alternatives)
            ));
            break;

        case 'get_stats':
            $stats = $manager->getReservationStats();
            echo json_encode(array(
                'success' => true,
                'stats' => $stats
            ));
            break;

        default:
            echo json_encode(array(
                'success' => false,
                'error' => 'Unknown action'
            ));
    }
    exit;
}

// If accessed directly without action, do nothing
?>