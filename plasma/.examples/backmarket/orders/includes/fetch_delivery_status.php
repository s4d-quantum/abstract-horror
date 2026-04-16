<?php
include '../../../db_config.php';

$order_id = $_POST['order_id'];

$fetch_order_query = mysqli_query($conn, "SELECT delivery_company, tracking_no FROM tbl_orders WHERE order_id = " . $order_id) or die('Error: ' . mysqli_error($conn));
$order_data = mysqli_fetch_assoc($fetch_order_query);

$delivery_company = $order_data['delivery_company'];
$tracking_no = $order_data['tracking_no'];

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
$result = file_get_contents($url, false, $context);
if ($result === false) {
/* Handle error */
}

if ($delivery_company == "DPD") {
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
    $dhl_url = 'https://api-eu.dhl.com/track/shipments?trackingNumber=' . urlencode($tracking_no) . '&requesterCountryCode=GB';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $dhl_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
        'DHL-API-Key: 51xBKZfBBkcdh6G2imj2UQs7qFUGRHF0'
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