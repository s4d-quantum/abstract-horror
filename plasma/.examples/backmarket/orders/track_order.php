<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php" ?>
<?php $global_url="../../"; ?>
<?php include "../../header.php" ?>

<?php
$order_id = $_GET['order_id'];

$fetch_order_query = mysqli_query($conn, "SELECT delivery_company, tracking_no FROM tbl_orders WHERE order_id = " . $order_id) or die('Error: ' . mysqli_error($conn));
$order_data = mysqli_fetch_assoc($fetch_order_query);

if (!$order_data) {
    die('Order not found.');
}

$delivery_company = $order_data['delivery_company'];
$delivery_company_key = strtolower(trim($delivery_company));
$tracking_no = trim($order_data['tracking_no']);

$events = [];
$summary_rows = [];

// Function to get Fedex OAuth token
function getFedexToken() {
    $fedex_key = $_ENV['FEDEX_API_KEY'] ?? getenv('FEDEX_API_KEY');
    $fedex_secret = $_ENV['FEDEX_API_SECRET'] ?? getenv('FEDEX_API_SECRET');
    $oauth_url = $_ENV['FEDEX_OAUTH_URL'] ?? getenv('FEDEX_OAUTH_URL');
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $oauth_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials&client_id=' . $fedex_key . '&client_secret=' . $fedex_secret);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/x-www-form-urlencoded'
    ));

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $data = json_decode($response, true);
        return $data['access_token'] ?? null;
    } else {
        error_log('Fedex OAuth error: ' . $response);
        return null;
    }
}

// Function to track Fedex shipment
function trackFedex($tracking_no) {
    $token = getFedexToken();
    if (!$token) {
        return ['error' => 'Could not obtain Fedex OAuth token'];
    }

    $fedex_api_url = $_ENV['FEDEX_API_URL'] ?? getenv('FEDEX_API_URL');
    $url = $fedex_api_url . '/track/v1/trackingnumbers';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'trackingInfo' => [
            [
                'trackingNumberInfo' => [
                    'trackingNumber' => $tracking_no
                ]
            ]
        ],
        'includeDetailedScans' => true
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Authorization: Bearer ' . $token,
        'X-locale: en_US',
        'Content-Type: application/json',
        'Accept: application/json'
    ));

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code == 200) {
        $data = json_decode($response, true);
        return $data;
    } else {
        error_log('Fedex tracking error: ' . $response);
        return ['error' => 'Fedex API error: ' . $response];
    }
}

function formatFedexAddress($address) {
    if (!is_array($address)) {
        return '';
    }

    $parts = [];
    if (!empty($address['city'])) {
        $parts[] = $address['city'];
    }
    if (!empty($address['stateOrProvinceCode'])) {
        $parts[] = $address['stateOrProvinceCode'];
    }
    if (!empty($address['countryName'])) {
        $parts[] = $address['countryName'];
    } elseif (!empty($address['countryCode'])) {
        $parts[] = $address['countryCode'];
    }

    if (!empty($address['postalCode'])) {
        $parts[] = $address['postalCode'];
    }

    return implode(', ', array_filter($parts));
}

function formatFedexLocation($location) {
    if (!is_array($location)) {
        return '';
    }

    $parts = [];
    $city = $location['city'] ?? '';
    $state = $location['stateOrProvinceCode'] ?? '';
    $country = $location['countryCode'] ?? '';

    if ($city) {
        $parts[] = $city;
    }

    if ($state && $state !== $city) {
        $parts[] = $state;
    }

    if ($country) {
        $parts[] = $country;
    }

    if (!empty($parts)) {
        return implode(', ', $parts);
    }

    if (!empty($location['postalCode'])) {
        return $location['postalCode'];
    }

    if (!empty($location['streetLines']) && is_array($location['streetLines'])) {
        return implode(', ', array_filter($location['streetLines']));
    }

    return '';
}

function humanizeFedexCode($code) {
    if (!$code) {
        return '';
    }

    $code = str_replace('_', ' ', (string)$code);
    return ucwords(strtolower($code));
}

function formatFedexDate($value) {
    if (!$value) {
        return '';
    }

    try {
        $dt = new \DateTime($value);
        return $dt->format('Y-m-d H:i T');
    } catch (\Exception $e) {
        return $value;
    }
}

function getUpsEnvValue($key) {
    // Try multiple methods to get the environment variable
    $value = null;
    
    // Try $_ENV first
    if (isset($_ENV[$key]) && $_ENV[$key] !== false) {
        $value = $_ENV[$key];
    }
    
    // If not found in $_ENV, try getenv()
    if ($value === null || $value === false) {
        $value = getenv($key);
    }
    
    // If still not found, try $_SERVER
    if ($value === null || $value === false) {
        $value = $_SERVER[$key] ?? null;
    }
    
    if ($value === null || $value === false) {
        return null;
    }
    
    if (is_string($value)) {
        $value = trim($value);
    }
    
    return $value === '' ? null : $value;
}

function getUpsToken() {
    $client_id = getUpsEnvValue('UPS_CLIENT_ID');
    $client_secret = getUpsEnvValue('UPS_CLIENT_SECRET');
    $merchant_id = getUpsEnvValue('UPS_MERCHANT_ID');
    $oauth_url = getUpsEnvValue('UPS_OAUTH_URL');

    // Debug logging to identify which credential is failing
    $credentials = [
        'client_id' => $client_id !== null ? 'SET' : 'NULL',
        'client_secret' => $client_secret !== null ? 'SET' : 'NULL',
        'merchant_id' => $merchant_id !== null ? 'SET' : 'NULL',
        'oauth_url' => $oauth_url !== null ? 'SET' : 'NULL'
    ];
    
    error_log('UPS Credentials Status: ' . json_encode($credentials));

    if ($client_id === null || $client_secret === null || $merchant_id === null || $oauth_url === null) {
        // Provide specific information about which credential is missing
        $missing = [];
        if ($client_id === null) $missing[] = 'UPS_CLIENT_ID';
        if ($client_secret === null) $missing[] = 'UPS_CLIENT_SECRET';
        if ($merchant_id === null) $missing[] = 'UPS_MERCHANT_ID';
        if ($oauth_url === null) $missing[] = 'UPS_OAUTH_URL';
        
        return array('error' => 'UPS credentials are not fully configured. Missing: ' . implode(', ', $missing));
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $oauth_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
    curl_setopt($ch, CURLOPT_USERPWD, $client_id . ':' . $client_secret);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/x-www-form-urlencoded',
        'x-merchant-id: ' . $merchant_id,
    ));
    
    // Add SSL verification settings to handle potential SSL issues
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $response = curl_exec($ch);
    if ($response === false) {
        $error = 'UPS OAuth curl error: ' . curl_error($ch);
        curl_close($ch);
        return array('error' => $error);
    }

    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        $decoded = json_decode($response, true);
        $messages = array();
        if (is_array($decoded)) {
            if (!empty($decoded['response']['errors']) && is_array($decoded['response']['errors'])) {
                foreach ($decoded['response']['errors'] as $error) {
                    $messages[] = $error['message'] ?? $error['code'] ?? 'Unknown UPS OAuth error.';
                }
            } elseif (!empty($decoded['error_description'])) {
                $messages[] = $decoded['error_description'];
            } elseif (!empty($decoded['message'])) {
                $messages[] = $decoded['message'];
            }
        }
        if (empty($messages)) {
            $messages[] = 'HTTP ' . $http_code;
        }
        return array('error' => 'UPS OAuth error: ' . implode('; ', $messages) . ' (Response: ' . substr($response, 0, 500) . ')');
    }

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return array('error' => 'UPS OAuth JSON decode error: ' . json_last_error_msg() . ' (Response: ' . substr($response, 0, 500) . ')');
    }

    if (empty($data['access_token'])) {
        return array('error' => 'UPS OAuth response missing access token. Response: ' . substr($response, 0, 500));
    }

    return array('access_token' => $data['access_token'], 'expires_in' => $data['expires_in'] ?? null);
}

function generateUpsTransactionId() {
    try {
        return bin2hex(random_bytes(16));
    } catch (\Exception $e) {
        return uniqid('ups_', true);
    }
}

function getUpsTrackingInfo($access_token, $tracking_number) {
    $base_url = getUpsEnvValue('UPS_TRACKING_URL');
    if (!$base_url) {
        return array('error' => 'UPS tracking URL not configured.');
    }

    $base_url = rtrim($base_url, '/');
    $transaction_id = generateUpsTransactionId();
    $url = $base_url . '/' . rawurlencode($tracking_number) . '?locale=en_US';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Authorization: Bearer ' . $access_token,
        'transId: ' . $transaction_id,
        'transactionSrc: s4d-tracking',
    ));
    
    // Add SSL verification settings
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $response = curl_exec($ch);
    if ($response === false) {
        $error = 'UPS tracking curl error: ' . curl_error($ch);
        curl_close($ch);
        return array('error' => $error);
    }

    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        return array('error' => 'UPS tracking error HTTP ' . $http_code . ': ' . substr($response, 0, 500));
    }

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return array('error' => 'UPS tracking JSON decode error: ' . json_last_error_msg() . ' (Response: ' . substr($response, 0, 500) . ')');
    }

    return array('data' => $data);
}

function formatUpsAddress($address) {
    if (!is_array($address)) {
        return '';
    }

    $parts = array();

    if (!empty($address['city'])) {
        $parts[] = $address['city'];
    }
    if (!empty($address['stateProvince'])) {
        $parts[] = $address['stateProvince'];
    }
    if (!empty($address['stateProvinceCode'])) {
        $parts[] = $address['stateProvinceCode'];
    }
    if (!empty($address['country'])) {
        $parts[] = $address['country'];
    }
    if (!empty($address['countryCode'])) {
        $parts[] = $address['countryCode'];
    }
    if (!empty($address['postalCode'])) {
        $parts[] = $address['postalCode'];
    }

    $parts = array_filter(array_unique($parts));

    return implode(', ', $parts);
}

function formatUpsDateTime($date, $time) {
    if (!$date && !$time) {
        return '';
    }

    $date_part = $date ?: '';
    $time_part = $time ?: '000000';
    $timestamp = trim($date_part . ' ' . $time_part);

    $dt = \DateTime::createFromFormat('Ymd His', $timestamp);
    if ($dt instanceof \DateTime) {
        return $dt->format('Y-m-d H:i');
    }

    $dt_date_only = \DateTime::createFromFormat('Ymd', $date_part);
    if ($dt_date_only instanceof \DateTime) {
        return $dt_date_only->format('Y-m-d');
    }

    return trim($date_part . ' ' . $time_part);
}

function extractUpsAddressByType($addresses, $type) {
    if (!is_array($addresses)) {
        return '';
    }

    foreach ($addresses as $entry) {
        if (!empty($entry['type']) && strtoupper($entry['type']) === strtoupper($type)) {
            return formatUpsAddress($entry['address'] ?? array());
        }
    }

    return '';
}

function trackUpsShipment($tracking_number) {
    $token_result = getUpsToken();
    if (!empty($token_result['error'])) {
        return array('error' => $token_result['error']);
    }

    $token = $token_result['access_token'] ?? null;
    if (!$token) {
        return array('error' => 'Could not authenticate with the UPS API.');
    }

    $response = getUpsTrackingInfo($token, $tracking_number);
    if (!empty($response['error'])) {
        return array('error' => $response['error']);
    }

    $data = $response['data'] ?? array();
    if (!empty($data['response']['errors']) && is_array($data['response']['errors'])) {
        $messages = array();
        foreach ($data['response']['errors'] as $error) {
            $message = $error['message'] ?? $error['code'] ?? null;
            if ($message) {
                $messages[] = $message;
            }
        }
        if (!empty($messages)) {
            return array('error' => implode('; ', $messages));
        }
    }

    $shipment = $data['trackResponse']['shipment'][0] ?? null;
    if (!$shipment) {
        return array('error' => 'UPS did not return shipment data for this tracking number. Response may not contain expected structure.');
    }

    $package = $shipment['package'][0] ?? array();
    $activities = $package['activity'] ?? array();

    $events = array();
    if (is_array($activities)) {
        foreach ($activities as $activity) {
            $status = $activity['status'] ?? array();
            $address = $activity['location']['address'] ?? array();
            $location = formatUpsAddress($address);

            if (!$location && !empty($activity['location']['slic'])) {
                $location = 'SLIC ' . $activity['location']['slic'];
            }

            $events[] = array(
                'timestamp' => formatUpsDateTime($activity['date'] ?? '', $activity['time'] ?? ''),
                'status' => $status['statusCode'] ?? ($status['type'] ?? ''),
                'description' => $status['description'] ?? '',
                'location' => $location,
            );
        }
    }

    $summary_rows = array();

    $current_status = $package['currentStatus'] ?? array();
    $status_value = $current_status['description'] ?? ($current_status['simplifiedTextDescription'] ?? '');
    if (!empty($status_value)) {
        $summary_rows[] = array('label' => 'Current Status', 'value' => $status_value);
    }

    $service_description = $package['service']['description'] ?? '';
    if (!$service_description) {
        $service_description = $package['service']['levelCode'] ?? '';
    }
    if (!empty($service_description)) {
        $summary_rows[] = array('label' => 'Service', 'value' => $service_description);
    }

    $origin = extractUpsAddressByType($package['packageAddress'] ?? array(), 'ORIGIN');
    if (!empty($origin)) {
        $summary_rows[] = array('label' => 'Origin', 'value' => $origin);
    }

    $destination = extractUpsAddressByType($package['packageAddress'] ?? array(), 'DESTINATION');
    if (!empty($destination)) {
        $summary_rows[] = array('label' => 'Destination', 'value' => $destination);
    }

    $weight = $package['weight']['weight'] ?? '';
    $weight_unit = $package['weight']['unitOfMeasurement'] ?? '';
    $weight_value = trim($weight . ' ' . $weight_unit);
    if ($weight_value !== '') {
        $summary_rows[] = array('label' => 'Weight', 'value' => $weight_value);
    }

    if (!empty($events)) {
        $events = array_reverse($events);
    }

    return array(
        'events' => $events,
        'summary_rows' => $summary_rows,
    );
}

if ($delivery_company_key === "dpd") {
    $url = 'https://apps.geopostuk.com/trackingcore/ie/parcels';
    $xmlString = <<<XML
<?xml version='1.0'?>
<trackingrequest>
  <user>S4D</user>
  <password>21screaM</password>
  <trackingnumbers>
    <trackingnumber>$tracking_no</trackingnumber>
  </trackingnumbers>
</trackingrequest>
XML;

    $options = [
        'http' => [
            'header' => "Content-type: application/xml; charset=utf-8\r\n",
            'method' => 'POST',
            'content' => $xmlString,
        ],
    ];

    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    if ($result !== false) {
        $xml = simplexml_load_string($result);
        if ($xml && isset($xml->trackingdetails->trackingdetail->trackingevents)) {
            $events_xml = $xml->trackingdetails->trackingdetail->trackingevents->trackingevent;
            foreach ($events_xml as $event) {
                $events[] = [
                    'timestamp' => (string)$event->date,
                    'description' => (string)$event->description,
                    'location' => (string)$event->locality . ', ' . (string)$event->countrycode,
                    'status' => (string)$event->type
                ];
            }
            // Reverse to show oldest first
            $events = array_reverse($events);
        }
    }
} else if ($delivery_company_key === "dhl") {
    $dhl_api_key = $_ENV['DHL_API_KEY'] ?? getenv('DHL_API_KEY');
    $dhl_api_url = $_ENV['DHL_API_URL'] ?? getenv('DHL_API_URL');
    
    if (!$dhl_api_key) {
        echo '<div class="alert alert-danger">DHL API key not configured.</div>';
    } else {
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
            echo 'cURL Error: ' . curl_error($ch);
        } else {
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($http_code == 200) {
                $data = json_decode($dhl_result, true);
                if (isset($data['shipments'][0]['events'])) {
                    foreach ($data['shipments'][0]['events'] as $event) {
                        $events[] = [
                            'timestamp' => $event['timestamp'],
                            'status' => $event['statusCode'],
                            'description' => $event['description'],
                            'location' => ($event['location']['address']['addressLocality'] ?? '') . ', ' . ($event['location']['address']['countryCode'] ?? '')
                        ];
                    }
                    // Events were newest first, reverse for oldest first
                    $events = array_reverse($events);
                }
            } else {
                echo '<div class="alert alert-danger">DHL API error: HTTP ' . $http_code . '</div>';
            }
        }
        curl_close($ch);
    }
} else if ($delivery_company_key === "fedex") {
    $fedex_data = trackFedex($tracking_no);

    if (isset($fedex_data['error'])) {
        echo '<div class="alert alert-danger">FedEx tracking error: ' . htmlspecialchars($fedex_data['error']) . '</div>';
    } else {
        $fedex_messages = [];
        $fedex_result = null;

        if (!empty($fedex_data['output']['completeTrackResults']) && is_array($fedex_data['output']['completeTrackResults'])) {
            foreach ($fedex_data['output']['completeTrackResults'] as $completeResult) {
                $resultEntries = $completeResult['trackResults'] ?? [];

                if (empty($resultEntries) || !is_array($resultEntries)) {
                    continue;
                }

                foreach ($resultEntries as $result) {
                    if (!empty($result['error'])) {
                        $fedex_messages[] = $result['error']['message'] ?? 'FedEx reported an unknown error for this shipment.';
                        continue;
                    }

                    if ($fedex_result === null) {
                        $fedex_result = $result;
                    }

                    if (!empty($result['scanEvents']) && is_array($result['scanEvents'])) {
                        foreach ($result['scanEvents'] as $event) {
                            $events[] = [
                                'timestamp' => formatFedexDate($event['date'] ?? ''),
                                'status' => $event['derivedStatusCode'] ?? $event['eventType'] ?? '',
                                'description' => $event['eventDescription'] ?? $event['exceptionDescription'] ?? '',
                                'location' => formatFedexLocation($event['scanLocation'] ?? []),
                            ];
                        }
                    }
                }
            }
        } else {
            $fedex_messages[] = 'FedEx did not return any tracking results for this number.';
        }

        if ($fedex_result) {
            $latest = $fedex_result['latestStatusDetail'] ?? [];
            $service = $fedex_result['serviceDetail']['description'] ?? $fedex_result['serviceDetail']['shortDescription'] ?? '';
            $origin = formatFedexAddress($fedex_result['originLocation']['locationContactAndAddress']['address'] ?? []);
            $destination = formatFedexAddress($fedex_result['destinationLocation']['locationContactAndAddress']['address'] ?? []);
            $delivered_to = trim(($fedex_result['deliveryDetails']['receivedByName'] ?? '') ?: ($fedex_result['recipientInformation']['address']['city'] ?? ''));

            $summary_rows = array_filter([
                ['label' => 'Status', 'value' => $latest['statusByLocale'] ?? $latest['description'] ?? ($latest['code'] ?? '')],
                ['label' => 'Description', 'value' => $latest['description'] ?? $latest['statusByLocale'] ?? ''],
                ['label' => 'Service', 'value' => $service],
                ['label' => 'Origin', 'value' => $origin],
                ['label' => 'Destination', 'value' => $destination],
                ['label' => 'Delivered To', 'value' => $delivered_to],
            ], function ($row) {
                return !empty($row['value']);
            });

            if (empty($events) && !empty($fedex_result['dateAndTimes']) && is_array($fedex_result['dateAndTimes'])) {
                foreach ($fedex_result['dateAndTimes'] as $dateItem) {
                    $events[] = [
                        'timestamp' => formatFedexDate($dateItem['dateTime'] ?? ''),
                        'status' => $dateItem['type'] ?? '',
                        'description' => humanizeFedexCode($dateItem['type'] ?? ''),
                        'location' => formatFedexLocation($latest['scanLocation'] ?? []),
                    ];
                }
            }
        }

        if (!empty($fedex_data['output']['alerts']) && is_array($fedex_data['output']['alerts'])) {
            foreach ($fedex_data['output']['alerts'] as $alert) {
                $message = $alert['message'] ?? 'FedEx alert received.';
                if (!empty($alert['code'])) {
                    $message .= ' (Code: ' . $alert['code'] . ')';
                }
                $fedex_messages[] = $message;
            }
        }

        $fedex_messages = array_unique(array_filter(array_map('trim', $fedex_messages)));

        foreach ($fedex_messages as $message) {
            echo '<div class="alert alert-warning">FedEx notice: ' . htmlspecialchars($message) . '</div>';
        }

        if (!empty($events)) {
            $events = array_reverse($events);
        }

        if (!$fedex_result && empty($fedex_messages)) {
            echo '<div class="alert alert-info">FedEx returned no tracking data for this shipment.</div>';
        }
    }
} else if ($delivery_company_key === "ups") {
    $ups_result = trackUpsShipment($tracking_no);

    if (!empty($ups_result['error'])) {
        echo '<div class="alert alert-danger">UPS tracking error: ' . htmlspecialchars($ups_result['error']) . '</div>';
        $events = array();
    } else {
        $events = $ups_result['events'] ?? array();
        $summary_rows = $ups_result['summary_rows'] ?? array();
    }
} else {
    echo '<div class="alert alert-warning">Unsupported carrier: ' . htmlspecialchars($delivery_company) . '</div>';
    $events = [];
}

?>

<!-- Content Wrapper. Contains page content -->
<div class="content-wrapper">
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <div class="box">
          <div class="box-header">
            <h3 class="box-title">Tracking Information for Order #<?php echo $order_id; ?></h3>
            <p><strong>Carrier:</strong> <?php echo htmlspecialchars($delivery_company); ?></p>
            <p><strong>Tracking Number:</strong> <?php echo htmlspecialchars($tracking_no); ?></p>
          </div>
          <div class="box-body">
            <?php if (!empty($summary_rows)): ?>
              <h4>Shipment Summary</h4>
              <table class="table table-bordered">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <?php foreach ($summary_rows as $row): ?>
                    <tr>
                      <td><?php echo htmlspecialchars($row['label']); ?></td>
                      <td><?php echo htmlspecialchars($row['value']); ?></td>
                    </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
            <?php endif; ?>

            <?php if (empty($events)): ?>
              <div class="alert alert-info">No tracking events available.</div>
            <?php else: ?>
              <h4>Tracking History</h4>
              <table class="table table-bordered">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  <?php foreach ($events as $event): ?>
                    <tr>
                      <td><?php echo htmlspecialchars($event['timestamp']); ?></td>
                      <td><?php echo htmlspecialchars($event['status'] ?? ''); ?></td>
                      <td><?php echo htmlspecialchars($event['description']); ?></td>
                      <td><?php echo htmlspecialchars($event['location'] ?? ''); ?></td>
                    </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
            <?php endif; ?>
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<?php include $global_url."footer.php"; ?>
