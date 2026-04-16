<?php include '../../../db_config.php';  ?>
<?php
    $response = array('data' => array(), 'total_rows' => 0);

    $page = isset($_POST['pageId']) ? max(1, intval($_POST['pageId'])) : 1;
    $searchTerm = isset($_POST['searchTerm']) ? trim($_POST['searchTerm']) : '';
    $limit = 10;
    $offset = ($page - 1) * $limit;

    $whereClause = "WHERE 1=1";
    $countWhereClause = "WHERE 1=1";

    if (!empty($searchTerm)) {
        $searchTerm = $conn->real_escape_string($searchTerm);
        $searchCondition = " (CAST(bm_order_id AS CHAR) LIKE '%$searchTerm%'
                            OR customer_name LIKE '%$searchTerm%'
                            OR sku LIKE '%$searchTerm%'
                            OR imei LIKE '%$searchTerm%'
                            OR shipper LIKE '%$searchTerm%'
                            OR tracking_number LIKE '%$searchTerm%')";
        $whereClause .= $searchCondition;
        $countWhereClause .= $searchCondition;
    }

    // Check if table exists first
    $tableCheck = $conn->query("SHOW TABLES LIKE 'bm_api_scratch'");
    if ($tableCheck->num_rows === 0) {
        echo json_encode($response);
        exit;
    }

    // Get total count for pagination
    $countQuery = "SELECT COUNT(*) as total FROM bm_api_scratch $countWhereClause";
    $countResult = $conn->query($countQuery);
    if ($countResult && $countResult->num_rows > 0) {
        $totalRows = $countResult->fetch_assoc()['total'];
        $response['total_rows'] = intval($totalRows);
    }

    // Get paginated data only if we have rows
    if ($response['total_rows'] > 0) {
        $query = "SELECT b.id, DATE_FORMAT(b.api_timestamp, '%Y-%m-%d %H:%i:%s') as api_timestamp,
                         b.bm_order_id, b.customer_name, b.sku, b.imei, b.state, b.shipper, b.tracking_number,
                         s.order_id as sales_order_id, s.goodsout_order_id, s.customer_id, s.is_completed
                  FROM bm_api_scratch b
                  LEFT JOIN tbl_imei_sales_orders s ON b.bm_order_id = s.order_id AND b.imei = s.item_code
                  $whereClause
                  ORDER BY b.api_timestamp DESC
                  LIMIT $limit OFFSET $offset";
        
        $result = $conn->query($query);
        
        if ($result && $result->num_rows > 0) {
            while ($row = $result->fetch_assoc()) {
                $response['data'][] = $row;
            }
        }
    }

    print json_encode($response);
?>