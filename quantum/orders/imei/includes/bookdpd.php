<?php

// Load environment variables
require_once __DIR__ . '/../../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->safeLoad();
require_once dirname(__DIR__, 3) . '/sales/imei_orders/includes/dpd_printer_helper.php';

// --- GeoSession API ---
define('LOGIN_URL', $_ENV['DPD_LOGIN_URL']);
define('SHIPMENT_URL', $_ENV['DPD_SHIPMENT_URL']);
define('AUTH_HEADER', $_ENV['DPD_AUTH_HEADER']); // base64 of user:pass
define('GEOCLIENT', $_ENV['DPD_GEOCLIENT']);

// --- MyShipments API ---
define('MYSHIP_LOGIN', $_ENV['MYSHIP_LOGIN_URL']);
define('MYSHIP_SHIPMENTS', $_ENV['MYSHIP_SHIPMENTS_URL']);
define('MYSHIP_EMAIL', $_ENV['MYSHIP_EMAIL']);
define('MYSHIP_PASS', $_ENV['MYSHIP_PASS']);

// --- Print Webhook ---
define('PRINT_WEBHOOK_URL', $_ENV['PRINT_WEBHOOK_URL']);
define('PRINT_API_KEY', $_ENV['PRINT_API_KEY']);
define('PRINTSERVER_BASE_URL', dpdEnvValue('PRINTSERVER_BASE_URL', PRINT_WEBHOOK_URL));
define('PRINTSERVER_API_KEY', dpdEnvValue('PRINTSERVER_API_KEY', PRINT_API_KEY));

// --- Argument parsing ---
$opts = getopt("", [
    "fn:",
    "ln:",
    "ph:",
    "st:",
    "city:",
    "pc:",
    "em:",
    "mob:",
    "county:",
    "locality:", // NEW: locality information
    "price:",   // NEW: order value for liability
    "ref:",     // NEW: consignment reference
    "cutoff:",  // NEW: collection cut-off time (HH:MM)
    "printer:", // NEW: print server endpoint (DPD template)
    "debug"
]);

$required = ['fn', 'ln', 'ph', 'st', 'city', 'pc', 'em', 'price', 'ref'];
foreach ($required as $opt) {
    if (!isset($opts[$opt])) {
        fwrite(STDERR, "Missing required argument: --$opt\n");
    fwrite(STDERR, "Usage: php bookdpd.php --fn FirstName --ln LastName --ph Phone --st \"Street Address\" --city City --pc Postcode --em email\@example.com --price Value --ref OrderRef [--mob Mobile] [--county County] [--locality Locality] [--cutoff HH:MM] [--debug]\n");
    exit(1);
}
}

$debug = isset($opts['debug']);
$dpd_printer_endpoint = resolveDpdPrinter(isset($opts['printer']) ? $opts['printer'] : null);
if ($debug) {
    echo "Using DPD printer endpoint: {$dpd_printer_endpoint}\n";
}

// --- Helper: HTTP POST with JSON body ---
function http_post_json($url, $headers, $data = null) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    if ($data !== null) {
        $json_data = json_encode($data);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $json_data);
        $headers[] = 'Content-Length: ' . strlen($json_data);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL Error: $error");
    }
    if ($http_code < 200 || $http_code >= 300) {
        throw new Exception("HTTP Error: $http_code\nResponse: $response");
    }

    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON decode error: " . json_last_error_msg() . "\nRaw response: $response");
    }

    return $decoded;
}

// --- Helper: HTTP GET ---
function http_get($url, $headers = []) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL Error: $error");
    }
    if ($http_code < 200 || $http_code >= 300) {
        throw new Exception("HTTP Error: $http_code\nResponse: $response");
    }

    return $response;
}

// --- Helper: POST raw ZPL to print webhook ---
function send_to_printer_webhook($zpl_content, $endpoint) {
    $config = getDpdPrinterConfig($endpoint);
    if (!$config['success']) {
        throw new Exception($config['message']);
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $config['url']);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $zpl_content);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'X-API-Key: ' . $config['api_key'],
        'Content-Type: text/plain'
    ));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("Printer webhook cURL Error: $error");
    }

    if ($http_code < 200 || $http_code >= 300) {
        throw new Exception("Printer webhook HTTP Error: $http_code\nResponse: $response");
    }

    return $response;
}

// --- Login to GeoSession ---
function login_geosession() {
    $headers = [
        'Authorization: ' . AUTH_HEADER,
        'Content-Type: application/json',
        'Accept: application/json'
    ];

    $result = http_post_json(LOGIN_URL, $headers);
    if (!isset($result['data']['geoSession'])) {
        throw new Exception("Login failed: geoSession not found in response.");
    }
    return $result['data']['geoSession'];
}

// --- Book shipment via GeoSession ---
function book_geosession($geo_session, $args) {
    $contact_name = trim($args['fn'] . ' ' . $args['ln']);
    $phone = $args['ph'];
    $email = $args['em'];
    $mobile = isset($args['mob']) ? $args['mob'] : $args['ph'];
    $street_full = $args['st'];

    $address = [
        'organisation' => $contact_name,
        'countryCode' => 'GB',
        'postcode' => $args['pc'],
        'addressLine1' => $street_full,
        'street' => $street_full,
        'town' => $args['city']
    ];
    if (isset($args['county'])) {
        $address['county'] = $args['county'];
    }
    if (isset($args['locality'])) {
        $address['locality'] = $args['locality'];
    }

    // Consignment reference passed as argument
    $consignmentRef = $args['ref'];

    // Set UK timezone for accurate time calculations
    date_default_timezone_set('Europe/London');
    
    // Get current UK time
    $current_time = new DateTime();
    
    // Determine cut-off time from args or default to 13:30
    $cutoff_arg = isset($args['cutoff']) ? trim($args['cutoff']) : '13:30';
    // Validate format HH:MM
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $cutoff_arg)) {
        // Fallback to default if invalid
        $cutoff_arg = '13:30';
    }
    list($cutoff_h, $cutoff_m) = array_map('intval', explode(':', $cutoff_arg));
    $cutoff_time = new DateTime();
    $cutoff_time->setTime($cutoff_h, $cutoff_m, 0);
    
    // Determine collection date based on current time
    if ($current_time < $cutoff_time) {
        // If before 13:30, collection is today at 15:30
        $collection_time = new DateTime();
        $collection_time->setTime(15, 30, 0);
    } else {
        // If 13:30 or later, collection is tomorrow at 15:30
        $collection_time = new DateTime('tomorrow');
        $collection_time->setTime(15, 30, 0);
    }
    
    $collectionDate = $collection_time->format('Y-m-d\TH:i:s');

    // Liability logic
    $price = floatval($args['price']);
    $liability = $price > 499;
    $liabilityValue = $liability ? $price : 0;

    $payload = [
        'collectionDate' => $collectionDate,
        'consolidate' => true,
        'consignment' => [[
            'consignmentRef' => $consignmentRef,
            'collectionDetails' => [
                'contactDetails' => [
                    'contactName' => 'S4D Warehouse',
                    'telephone' => '01782 330780'
                ],
                'address' => [
                    'organisation' => 'S4D Ltd',
                    'countryCode' => 'GB',
                    'postcode' => 'ST3 5XA',
                    'street' => 'Parkhall Road',
                    'town' => 'Stoke on Trent',
                    'county' => 'Staffordshire'
                ]
            ],
            'deliveryDetails' => [
                'contactDetails' => [
                    'contactName' => $contact_name,
                    'telephone' => $phone
                ],
                'address' => $address,
                'notificationDetails' => [
                    'email' => $email,
                    'mobile' => $mobile
                ]
            ],
            'networkCode' => '2^13',
            'numberOfParcels' => 1,
            'totalWeight' => 1.0,
            'parcelDescription' => 'Mobile Phone',
            'liability' => $liability,
            'liabilityValue' => $liabilityValue
        ]]
    ];

    echo "Booking payload:\n";
    echo json_encode($payload, JSON_PRETTY_PRINT) . "\n";

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'GeoClient: ' . GEOCLIENT,
        'GeoSession: ' . $geo_session
    ];

    $result = http_post_json(SHIPMENT_URL, $headers, $payload);

    if (!isset($result['data']['consignmentDetail'][0])) {
        throw new Exception("Booking failed: no consignment detail returned.");
    }

    // Validate API response structure and extract values with proper error handling
    if (!isset($result['data']['shipmentId'])) {
        throw new Exception("API response missing shipmentId");
    }

    if (!isset($result['data']['consignmentDetail']) || !is_array($result['data']['consignmentDetail']) || empty($result['data']['consignmentDetail'])) {
        throw new Exception("API response missing or invalid consignmentDetail array");
    }

    $consignmentDetail = $result['data']['consignmentDetail'][0];
    if (!isset($consignmentDetail['consignmentNumber'])) {
        throw new Exception("API response missing consignmentNumber in consignmentDetail");
    }

    if (!isset($consignmentDetail['parcelNumbers']) || !is_array($consignmentDetail['parcelNumbers']) || empty($consignmentDetail['parcelNumbers'])) {
        throw new Exception("API response missing or invalid parcelNumbers array");
    }

    $shipment_id = $result['data']['shipmentId'] ?? '';
    $consignment = $consignmentDetail['consignmentNumber'];
    $parcel = $consignmentDetail['parcelNumbers'][0];

    // Validate that we have non-empty values
    if (empty($consignment)) {
        throw new Exception("Consignment number is empty");
    }

    if (empty($parcel)) {
        throw new Exception("Parcel number is empty");
    }

    echo "Booked consignment $consignment, parcel $parcel\n";
    return [$consignment, $parcel, $shipment_id];
}

// --- Login to MyShipments and return cookie string ---
function login_myshipments() {
    $login_data = [
        'email' => MYSHIP_EMAIL,
        'password' => MYSHIP_PASS
    ];

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, MYSHIP_LOGIN);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($login_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers_raw = substr($response, 0, $header_size);
    curl_close($ch);

    if ($http_code < 200 || $http_code >= 300) {
        throw new Exception("MyShipments login failed: HTTP $http_code");
    }

    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headers_raw, $matches);
    $cookies = implode('; ', $matches[1]);

    if (empty($cookies)) {
        throw new Exception("Login failed: no cookies received.");
    }

    return $cookies;
}

// --- Find UUID and download ZPL label, then send to webhook ---
function find_uuid_and_label($cookies, $consignment, $parcel, $debug = false, $printerEndpoint = null) {
    $headers = [
        'Cookie: ' . $cookies,
        'Accept: application/json'
    ];

    $url = MYSHIP_SHIPMENTS . '?searchPage=1';
    $response = http_get($url, $headers);
    $body = json_decode($response, true);

    if (!isset($body['data'])) {
        throw new Exception("Invalid response from MyShipments: " . json_encode($body));
    }

    $total_results = $body['data']['totalResults'] ?? 0;
    if ($total_results == 0) {
        throw new Exception("No shipments found in MyShipments");
    }

    $results = $body['data']['results'] ?? [];
    $per_page = count($results) ?: 20;
    $last_page = ceil($total_results / $per_page);

    if ($debug) {
        echo "Total results: $total_results, per_page: $per_page, last_page: $last_page\n";
    }

    for ($page = $last_page; $page >= 1; $page--) {
        $url = MYSHIP_SHIPMENTS . '?searchPage=' . $page;
        $response = http_get($url, $headers);
        $body = json_decode($response, true);
        $shipments = $body['data']['results'] ?? [];

        if ($debug) {
            echo "DEBUG Page $page has " . count($shipments) . " results\n";
        }

        foreach ($shipments as $ship) {
            $outbound = $ship['outboundConsignment'] ?? [];
            if (($outbound['consignmentNumber'] ?? '') === $consignment) {
                $uuid = $ship['shipmentId'];
                echo "Found UUID $uuid for consignment $consignment\n";

                $label_url = MYSHIP_SHIPMENTS . "/$uuid/labels?parcelNumbers=$parcel&printerType=3";
                $label_headers = ['Cookie: ' . $cookies];
                $label_content = http_get($label_url, $label_headers);

                if (!preg_match('/\^XZ\s*$/', $label_content)) {
                    $label_content = rtrim($label_content, "\r\n") . "\n^XZ\n";
                }

                file_put_contents('label.zpl', $label_content);
                echo "✅ Label saved as label.zpl\n";

                // Send label to webhook here
                echo "📤 Sending to print webhook (endpoint: {$printerEndpoint})...\n";
                $webhook_response = send_to_printer_webhook($label_content, $printerEndpoint);
                echo "✅ Print webhook responded: " . trim($webhook_response) . "\n";

                return;
            }
        }
    }

    throw new Exception("Could not find consignment in MyShipments list");
}

// --- MAIN ---
try {
    echo "🔐 Logging into GeoSession...\n";
    $geo_session = login_geosession();

    echo "📦 Booking shipment...\n";
    [$consignment, $parcel, $shipment_id] = book_geosession($geo_session, $opts);

    echo "🔑 Logging into MyShipments...\n";
    $cookies = login_myshipments();

    echo "🖨️  Searching for shipment and downloading ZPL label...\n";
    find_uuid_and_label($cookies, $consignment, $parcel, $debug, $dpd_printer_endpoint);

    if ($debug) {
        echo "🎉 Done! Label sent to printer webhook.\n";
    }

    // Validate final values before returning
    if (empty($consignment) || empty($parcel) || empty($shipment_id)) {
        throw new Exception("One or more required values are empty: consignment='$consignment', parcel='$parcel', shipment_id='$shipment_id'");
    }

    // Return clean JSON response without status messages
    $response = [
        'success' => true,
        'consignment_no' => $consignment,
        'parcel_no' => $parcel,
        'shipment_id' => $shipment_id
    ];

    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

} catch (Exception $e) {
    if ($debug) {
        fwrite(STDERR, "❌ Error: " . $e->getMessage() . "\n");
    }

    // Return consistent error response format
    $error_response = [
        'success' => false,
        'error' => $e->getMessage(),
        'error_type' => get_class($e)
    ];

    echo json_encode($error_response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
    exit(1);
}
