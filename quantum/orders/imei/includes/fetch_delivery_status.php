<?php
include '../../../db_config.php';

function getEnvValue($key) {
    $value = null;

    if (isset($_ENV[$key]) && $_ENV[$key] !== false) {
        $value = $_ENV[$key];
    }

    if ($value === null || $value === false) {
        $value = getenv($key);
    }

    if ($value === null || $value === false) {
        $value = $_SERVER[$key] ?? null;
    }

    if (is_string($value)) {
        $value = trim($value);
        $value = trim($value, "\"'");
    }

    return $value === '' ? null : $value;
}

function getDpdTrackingCredentials() {
    $user = getEnvValue('DPD_TRACKING_USER');
    $pass = getEnvValue('DPD_TRACKING_PASS');

    if (!$user || !$pass) {
        $authHeader = getEnvValue('DPD_AUTH_HEADER');
        if ($authHeader) {
            $authHeader = preg_replace('/^Basic\\s+/i', '', $authHeader);
            $decoded = base64_decode($authHeader, true);
            if ($decoded !== false && strpos($decoded, ':') !== false) {
                list($decodedUser, $decodedPass) = explode(':', $decoded, 2);
                if (!$user) {
                    $user = $decodedUser;
                }
                if (!$pass) {
                    $pass = $decodedPass;
                }
            }
        }
    }

    if (!$user || !$pass) {
        return ['error' => 'DPD tracking credentials not configured. Set DPD_TRACKING_USER and DPD_TRACKING_PASS in .env.'];
    }

    return ['user' => $user, 'pass' => $pass];
}

$order_id = $_POST['order_id'];

$fetch_order_query = mysqli_query($conn, "SELECT delivery_company, tracking_no FROM tbl_orders WHERE order_id = " . $order_id) or die('Error: ' . mysqli_error($conn));
$order_data = mysqli_fetch_assoc($fetch_order_query);

$delivery_company = $order_data['delivery_company'];
$tracking_no = $order_data['tracking_no'];

if ($delivery_company == "DPD") {
    $url = 'https://apps.geopostuk.com/trackingcore/ie/parcels';
    $dpd_creds = getDpdTrackingCredentials();
    if (!empty($dpd_creds['error'])) {
        echo json_encode(['delivered' => false, 'error' => $dpd_creds['error']]);
        exit;
    }

    $dpd_user = htmlspecialchars($dpd_creds['user'], ENT_XML1);
    $dpd_pass = htmlspecialchars($dpd_creds['pass'], ENT_XML1);
    $tracking_no_xml = htmlspecialchars($tracking_no, ENT_XML1);
    $xmlString = <<<XML
<?xml version='1.0'?>
<trackingrequest>
  <user>{$dpd_user}</user>
  <password>{$dpd_pass}</password>
  <trackingnumbers>
    <trackingnumber>{$tracking_no_xml}</trackingnumber>
  </trackingnumbers>
</trackingrequest>
XML;

    libxml_use_internal_errors(true);

    $data = simplexml_load_string($xmlString);
    if ($data === false) {
        foreach (libxml_get_errors() as $error) {
            echo "XML Error: " . $error->message . "\n";
        }
        libxml_clear_errors();
        // Handle the error as appropriate
    }

    $options = [
        'http' => [
            'header' => "Content-type: application/xml; charset=utf-8\r\n",
            'method' => 'POST',
            'content' => $xmlString,
        ],
    ];

    $context = stream_context_create($options);
    $result = @file_get_contents($url, false, $context);
    if ($result === false) {
        echo json_encode(['delivered' => false, 'error' => 'DPD tracking request failed.']);
        exit;
    }
    // Parse DPD XML response
    $xml = simplexml_load_string($result);
    if ($xml && isset($xml->trackingdetails->trackingdetail->trackingevents->trackingevent[0])) {
        $latest_event = $xml->trackingdetails->trackingdetail->trackingevents->trackingevent[0];
        $is_delivered = (string)$latest_event->type === 'DELIVERED';
        echo json_encode(['delivered' => $is_delivered, 'status' => (string)$latest_event->type, 'timestamp' => (string)$latest_event->date]);
    } else {
        echo json_encode(['delivered' => false, 'error' => 'Invalid DPD response or no tracking events']);
    }
} else if ($delivery_company == "DHL") {
    $dhl_api_key = getEnvValue('DHL_API_KEY');
    $dhl_api_url = getEnvValue('DHL_API_URL') ?: 'https://api-eu.dhl.com';

    if (!$dhl_api_key) {
        echo json_encode(['delivered' => false, 'error' => 'DHL API key not configured.']);
        exit;
    }

    $dhl_api_url = rtrim($dhl_api_url, '/');
    $dhl_url = $dhl_api_url . '/track/shipments?trackingNumber=' . urlencode($tracking_no) . '&requesterCountryCode=GB';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $dhl_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'DHL-API-Key: ' . $dhl_api_key
    ));

    $dhl_result = curl_exec($ch);
    if (curl_errno($ch)) {
        echo json_encode(['delivered' => false, 'error' => 'cURL Error: ' . curl_error($ch)]);
    } else {
        $dhl_data = json_decode($dhl_result, true);
        if (isset($dhl_data['shipments'][0]['events'][0])) {
            $latest_event = $dhl_data['shipments'][0]['events'][0];
            $is_delivered = ($latest_event['statusCode'] === 'delivered' || $latest_event['status'] === '101');
            echo json_encode(['delivered' => $is_delivered, 'status' => $latest_event['description'], 'timestamp' => $latest_event['timestamp']]);
        } else {
            echo json_encode(['delivered' => false, 'error' => 'Invalid DHL response or no events']);
        }
    }
    curl_close($ch);
} else {
    echo json_encode(['delivered' => false, 'error' => 'Unsupported delivery company']);
}
