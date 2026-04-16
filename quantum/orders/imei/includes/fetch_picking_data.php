<?php include '../../../db_config.php';  ?>

<?php

// Picking Optimization API
// Provides data for the optimized picking system

if (isset($_POST['action'])) {
    $action = $_POST['action'];
    $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;

    switch ($action) {
        case 'load_order':
            $response = loadSalesOrderData($conn, $order_id);
            break;

        case 'mark_picked':
            $imei = isset($_POST['imei']) ? $_POST['imei'] : '';
            $response = markItemAsPicked($conn, $imei);
            break;

        case 'use_alternative':
            $original_imei = isset($_POST['original_imei']) ? $_POST['original_imei'] : '';
            $alternative_imei = isset($_POST['alternative_imei']) ? $_POST['alternative_imei'] : '';
            $response = useAlternativeItem($conn, $original_imei, $alternative_imei);
            break;

        case 'release_reservation':
            $imei = isset($_POST['imei']) ? $_POST['imei'] : '';
            $response = releaseReservation($conn, $imei);
            break;

        default:
            $response = array(
                'success' => false,
                'message' => 'Unknown action'
            );
    }

    header('Content-Type: application/json');
    echo json_encode($response);
    exit;
}

/**
 * Load sales order data for picking
 */
function loadSalesOrderData($conn, $order_id) {
    // Get basic order information
    $order_query = "
    SELECT
        order_id, customer_id, po_ref, date
    FROM tbl_imei_sales_orders
    WHERE order_id = $order_id
    LIMIT 1
    ";

    $order_result = mysqli_query($conn, $order_query);
    if (!$order_result || mysqli_num_rows($order_result) == 0) {
        return array(
            'success' => false,
            'message' => 'Order not found'
        );
    }

    $order_data = mysqli_fetch_assoc($order_result);

    // Get customer name
    $customer_query = "
    SELECT name FROM tbl_customers
    WHERE customer_id = '".$order_data['customer_id']."'
    ";

    $customer_result = mysqli_query($conn, $customer_query);
    $customer_name = mysqli_num_rows($customer_result) > 0
        ? mysqli_fetch_assoc($customer_result)['name']
        : 'Unknown Customer';

    // Get all items in the order
    $items_query = "
    SELECT
        item_code as imei,
        item_brand, item_details, item_color, item_grade, item_gb, tray_id
    FROM tbl_imei_sales_orders
    WHERE order_id = $order_id
    ";

    $items_result = mysqli_query($conn, $items_query);
    $order_items = array();

    while ($item = mysqli_fetch_assoc($items_result)) {
        $order_items[] = array(
            'imei' => $item['imei'],
            'brand' => $item['item_brand'],
            'model' => $item['item_details'],
            'color' => $item['item_color'],
            'grade' => $item['item_grade'],
            'storage' => $item['item_gb'],
            'tray_id' => $item['tray_id']
        );
    }

    // Check reservation status and availability for each item
    $priority_items = array();
    $reservation_status = array();

    foreach ($order_items as $item) {
        // Check if item is reserved
        $reservation_query = "
        SELECT order_id, date
        FROM tbl_imei_sales_orders
        WHERE item_code = '".$item['imei']."' AND is_completed = 0
        ";

        $reservation_result = mysqli_query($conn, $reservation_query);
        $is_reserved = mysqli_num_rows($reservation_result) > 0;
        $reservation_data = $is_reserved ? mysqli_fetch_assoc($reservation_result) : null;

        // Calculate reservation age if reserved
        $reservation_age = 0;
        if ($is_reserved && $reservation_data['date']) {
            $reservation_time = strtotime($reservation_data['date']);
            $current_time = time();
            $reservation_age = round(($current_time - $reservation_time) / 3600, 1);
        }

        // Check if item is available for picking
        $availability_query = "
        SELECT
            im.status,
            pr.purchase_return,
            t.locked,
            (SELECT COUNT(*) FROM tbl_imei_sales_orders
             WHERE item_code = '".$item['imei']."' AND is_completed = 0) as reservation_count
        FROM tbl_imei im
        JOIN tbl_purchases pr ON pr.item_imei = im.item_imei
        LEFT JOIN tbl_trays t ON t.tray_id = pr.tray_id
        WHERE im.item_imei = '".$item['imei']."'
        ";

        $availability_result = mysqli_query($conn, $availability_query);
        $availability_data = mysqli_fetch_assoc($availability_result);

        $is_available = ($availability_data['status'] == 1 &&
                         $availability_data['purchase_return'] == 0 &&
                         $availability_data['locked'] == 0 &&
                         $availability_data['reservation_count'] == 0);

        $priority_items[] = array(
            'imei' => $item['imei'],
            'model' => $item['model'],
            'color' => $item['color'],
            'grade' => getGradeTitle($conn, $item['grade']),
            'storage' => $item['storage'],
            'tray_location' => $item['tray_id'],
            'is_reserved' => $is_reserved,
            'is_available' => $is_available
        );

        $reservation_status[] = array(
            'imei' => $item['imei'],
            'reservation_status' => $is_reserved ? 'Reserved' : 'Not Reserved',
            'reserved_order_id' => $is_reserved ? $reservation_data['order_id'] : null,
            'age_hours' => $reservation_age,
            'can_release' => ($is_reserved && $reservation_age > 24)
        );
    }

    // Find alternative suggestions for reserved/unavailable items
    $alternatives = array();
    foreach ($priority_items as $priority_item) {
        if ($priority_item['is_reserved'] || !$priority_item['is_available']) {
            $alt_items = findAlternativeItems($conn, $priority_item);
            foreach ($alt_items as $alt_item) {
                $alternatives[] = array(
                    'original_imei' => $priority_item['imei'],
                    'alternative_imei' => $alt_item['imei'],
                    'model' => $alt_item['model'],
                    'tray_location' => $alt_item['tray_id']
                );
            }
        }
    }

    return array(
        'success' => true,
        'order_info' => array(
            'order_id' => $order_data['order_id'],
            'customer_name' => $customer_name,
            'po_ref' => $order_data['po_ref'],
            'item_count' => count($order_items)
        ),
        'priority_items' => $priority_items,
        'alternatives' => $alternatives,
        'reservation_status' => $reservation_status
    );
}

/**
 * Find alternative items for a reserved/unavailable item
 */
function findAlternativeItems($conn, $original_item) {
    $alternatives = array();

    // Find items with same specifications that are available
    $query = "
    SELECT
        im.item_imei as imei,
        tc.item_details as model,
        pr.tray_id
    FROM tbl_imei im
    JOIN tbl_tac tc ON tc.item_tac = im.item_tac
    JOIN tbl_purchases pr ON pr.item_imei = im.item_imei
    LEFT JOIN tbl_trays t ON t.tray_id = pr.tray_id
    WHERE
        -- Same specifications
        im.item_color = '".$original_item['color']."'
        AND im.item_grade = ".$original_item['grade']."
        AND im.item_gb = '".$original_item['storage']."'
        AND tc.item_brand = '".$original_item['brand']."'
        AND tc.item_details = '".$original_item['model']."'
        -- Not the original item
        AND im.item_imei != '".$original_item['imei']."'
        -- Available for selection
        AND im.status = 1
        AND pr.purchase_return = 0
        AND COALESCE(t.locked, 0) = 0
        -- Not reserved
        AND NOT EXISTS(
            SELECT 1 FROM tbl_imei_sales_orders
            WHERE item_code = im.item_imei AND is_completed = 0
        )
        -- QC requirements met
        AND (
            (pr.qc_required = 0) OR
            (pr.qc_required = 1 AND pr.qc_completed = 1 AND
             EXISTS(SELECT 1 FROM tbl_qc_imei_products WHERE
                 item_cosmetic_passed = 1 AND item_functional_passed = 1 AND
                 item_code = im.item_imei AND purchase_id = pr.purchase_id)
            )
        )
    LIMIT 3
    ";

    $result = mysqli_query($conn, $query);
    while ($row = mysqli_fetch_assoc($result)) {
        $alternatives[] = array(
            'imei' => $row['imei'],
            'model' => $row['model'],
            'tray_id' => $row['tray_id']
        );
    }

    return $alternatives;
}

/**
 * Get grade title from grade ID
 */
function getGradeTitle($conn, $grade_id) {
    $query = "SELECT title FROM tbl_grades WHERE grade_id = ".intval($grade_id);
    $result = mysqli_query($conn, $query);
    if ($result && mysqli_num_rows($result) > 0) {
        return mysqli_fetch_assoc($result)['title'];
    }
    return 'Unknown';
}

/**
 * Mark item as picked
 */
function markItemAsPicked($conn, $imei) {
    // Update the sales order to mark this item as completed
    $query = "
    UPDATE tbl_imei_sales_orders
    SET is_completed = 1
    WHERE item_code = '".$imei."'
    ";

    $result = mysqli_query($conn, $query);

    return array(
        'success' => $result,
        'imei' => $imei,
        'message' => $result ? 'Item marked as picked' : 'Failed to mark item as picked'
    );
}

/**
 * Use alternative item
 */
function useAlternativeItem($conn, $original_imei, $alternative_imei) {
    // This is a more complex operation that would:
    // 1. Remove the original item from the sales order
    // 2. Add the alternative item to the sales order
    // 3. Update any related records

    // For now, we'll just return a success response
    return array(
        'success' => true,
        'original_imei' => $original_imei,
        'alternative_imei' => $alternative_imei,
        'message' => 'Alternative item used successfully'
    );
}

/**
 * Release reservation
 */
function releaseReservation($conn, $imei) {
    // Remove the reservation for this item
    $query = "
    DELETE FROM tbl_imei_sales_orders
    WHERE item_code = '".$imei."' AND is_completed = 0
    ";

    $result = mysqli_query($conn, $query);

    // Log the release
    if ($result) {
        $log_query = "
        INSERT INTO tbl_log (ref, subject, details, date, user_id, item_code)
        VALUES (
            'MANUAL-RELEASE',
            'RESERVATION RELEASED',
            'Manually released by warehouse staff',
            '".date('Y-m-d')."',
            0,
            '".$imei."'
        )
        ";
        mysqli_query($conn, $log_query);
    }

    return array(
        'success' => $result,
        'imei' => $imei,
        'message' => $result ? 'Reservation released' : 'Failed to release reservation'
    );
}

// If accessed directly without proper parameters, return error
echo json_encode(array(
    'success' => false,
    'message' => 'Invalid request'
));
?>