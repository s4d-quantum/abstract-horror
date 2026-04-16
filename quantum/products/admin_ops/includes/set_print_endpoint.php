<?php
include '../../../db_config.php';
include "../../../authenticate.php";
require_once 'label_helper.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed.'
    ]);
    exit;
}

$endpoint = isset($_POST['endpoint']) ? trim($_POST['endpoint']) : '';
$available = getAvailablePrintEndpoints();

if ($endpoint === '' || !array_key_exists($endpoint, $available)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid printer selection.'
    ]);
    exit;
}

$selected = resolvePrintEndpoint($endpoint);

echo json_encode([
    'success' => true,
    'endpoint' => $selected,
    'label' => $available[$selected]
]);
