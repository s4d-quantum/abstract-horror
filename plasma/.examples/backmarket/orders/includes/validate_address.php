<?php
// validate_address.php
// Usage: php validate_address.php <bm_order_id>

// Load environment variables
require_once __DIR__ . '/../../../vendor/autoload.php';
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
$dotenv->safeLoad();

$host = $_ENV['DB_HOST'];
$username = $_ENV['DB_USERNAME'];
$password = $_ENV['DB_PASSWORD'];
$database = $_ENV['DB_DATABASE'];
$port = $_ENV['DB_PORT'];

$mysqli = new mysqli($host, $username, $password, $database, $port);
if ($mysqli->connect_errno) {
    die("DB connection failed: " . $mysqli->connect_error);
}

$API_KEY = $_ENV['GETADDRESS_API_KEY'];

$bm_order_id = $argv[1] ?? null;
if (!$bm_order_id) {
    die("Usage: php validate_address.php <bm_order_id>\n");
}

// Fetch the order
$stmt = $mysqli->prepare("SELECT * FROM tbl_bm2 WHERE bm_order_id = ? LIMIT 1");
$stmt->bind_param("s", $bm_order_id);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    die("No record found for bm_order_id $bm_order_id\n");
}
$row = $res->fetch_assoc();

$street     = $row['street'] ?? '';
$street2    = $row['street_2'] ?? '';
$city       = $row['city'] ?? '';
$postcode   = strtoupper(trim($row['postal_code'] ?? ''));
$country    = $row['country'] ?? '';

$raw_input = trim("$street $street2 $city $postcode $country");

// --- Helper: call API ---
function call_api($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$httpCode, $response];
}

// --- 1. Validate strict=true ---
$url = "https://api.getAddress.io/validate/" . rawurlencode($raw_input) . "?api-key=" . $API_KEY . "&strict=true";
list($code, $resp) = call_api($url);
$data = json_decode($resp, true);

$status = $data['status'] ?? 0;
$addr   = $data['address'] ?? [];

// --- 2. Try strict=false if 404 ---
if ($status == 404) {
    $url = "https://api.getAddress.io/validate/" . rawurlencode($raw_input) . "?api-key=" . $API_KEY . "&strict=false";
    list($code, $resp) = call_api($url);
    $data = json_decode($resp, true);
    $status = $data['status'] ?? 0;
    $addr   = $data['address'] ?? [];
}

// --- 3. Fallback: find by postcode ---
if ($status == 404 && $postcode) {
    $url = "https://api.getAddress.io/find/" . rawurlencode($postcode) . "?api-key=" . $API_KEY;
    list($code, $resp) = call_api($url);
    $find = json_decode($resp, true);

    if (isset($find['addresses']) && is_array($find['addresses'])) {
        $best = null;
        $bestScore = PHP_INT_MAX;
        foreach ($find['addresses'] as $candidate) {
            $cand = implode(' ', $candidate);
            $score = levenshtein(strtolower($raw_input), strtolower($cand));
            if ($score < $bestScore) {
                $bestScore = $score;
                $best = $candidate;
            }
        }
        if ($best) {
            $addr = [
                "line_1" => $best[0] ?? '',
                "line_2" => $best[1] ?? '',
                "line_3" => $best[2] ?? '',
                "line_4" => $best[3] ?? '',
                "postcode" => $postcode,
                "town_or_city" => $city,
                "county" => "",
                "country" => "England"
            ];
            $status = 200; // treat as resolved
        }
    }
}

// --- Update DB ---
if ($status == 200) {
    // Assign values to variables before binding
    $v_building_number = $addr['building_number'] ?? null;
    $v_thoroughfare    = $addr['thoroughfare'] ?? null;
    $v_line_1          = $addr['line_1'] ?? null;
    $v_line_2          = $addr['line_2'] ?? null;
    $v_line_3          = $addr['line_3'] ?? null;
    $v_line_4          = $addr['line_4'] ?? null;
    $v_postcode        = $addr['postcode'] ?? null;
    $v_town            = $addr['town_or_city'] ?? null;
    $v_county          = $addr['county'] ?? null;
    $v_country         = $addr['country'] ?? null;

    $stmt = $mysqli->prepare("UPDATE tbl_bm2 SET 
        v_building_number=?, v_thoroughfare=?, v_line_1=?, v_line_2=?, v_line_3=?, v_line_4=?,
        v_postcode=?, v_town=?, v_county=?, v_country=?, v_status=?
        WHERE bm_order_id=?");

    $stmt->bind_param(
        "ssssssssssis",
        $v_building_number, $v_thoroughfare,
        $v_line_1, $v_line_2, $v_line_3, $v_line_4,
        $v_postcode, $v_town, $v_county, $v_country,
        $status, $bm_order_id
    );

    if ($stmt->execute()) {
        echo "[ok] Address validated and saved for bm_order_id $bm_order_id\n";
    } else {
        echo "[error] DB update failed: " . $stmt->error . "\n";
    }
} else {
    $stmt = $mysqli->prepare("UPDATE tbl_bm2 SET v_status=? WHERE bm_order_id=?");
    $stmt->bind_param("is", $status, $bm_order_id);
    $stmt->execute();

    echo "[flagged] Could not validate address for bm_order_id $bm_order_id (status $status)\n";
}
