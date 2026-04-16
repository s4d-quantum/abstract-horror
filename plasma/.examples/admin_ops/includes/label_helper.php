<?php

/**
 * Generate ZPL label code for a device
 *
 * @param string $brand Brand name (e.g., "Samsung")
 * @param string $model Model name (e.g., "S928B/DS")
 * @param string $storage Storage capacity (e.g., "256")
 * @param string $color Color (e.g., "Titanium Grey")
 * @param string $grade Grade (e.g., "A")
 * @param string $imei IMEI number
 * @return string ZPL code
 */
function generateZPL($brand, $model, $storage, $color, $grade, $imei) {
    // Clean and prepare data
    $brand = trim($brand);
    $model = trim($model);
    $storage = trim($storage);
    $color = trim($color);
    $grade = trim($grade);
    $imei = trim($imei);

    // Build device description line
    // Only include grade if it has a meaningful value (not empty, not 'N/A', not 'Unknown')
    $deviceLine = "{$brand} {$model} {$storage}GB {$color}";
    if (!empty($grade) && $grade !== 'N/A' && $grade !== 'Unknown') {
        $deviceLine .= " Grade {$grade}";
    }

    // Generate ZPL using working template format
    $zpl = "^XA\n";
    $zpl .= "^PW900\n";
    $zpl .= "^LL450\n";
    $zpl .= "^LS0\n";
    $zpl .= "\n";
    $zpl .= "~SD15\n";  // darkness 15
    $zpl .= "^CI0\n";
    $zpl .= "\n";

    // Barcode (Code128) - centered horizontally
    $zpl .= "^BY3,3,54\n";
    $zpl .= "^FT130,284\n";
    $zpl .= "^BCN,,Y,N\n";  // Y = print interpretation line
    $zpl .= "^FD{$imei}^FS\n";
    $zpl .= "\n";

    // Top text - device information, centered
    $zpl .= "^FO0,158\n";          // x=0, y=158
    $zpl .= "^FB900,1,0,C,0\n";    // width 900 (same as ^PW), center aligned
    $zpl .= "^A0N,42,40\n";
    $zpl .= "^FD{$deviceLine}^FS\n";
    $zpl .= "\n";

    $zpl .= "^PQ1\n";
    $zpl .= "^XZ\n";

    return $zpl;
}

/**
 * Print ZPL label via webhook or local server
 *
 * @param string $zpl ZPL code to print
 * @param string $mode 'cloud' or 'local'
 * @return array Result with 'success' and 'message'
 */
function printLabel($zpl, $mode = 'cloud') {
    if ($mode === 'local') {
        return printLabelLocal($zpl);
    } else {
        return printLabelCloud($zpl);
    }
}

/**
 * Print label via cloud webhook
 */
function printLabelCloud($zpl) {
    $url = 'https://whprint.quantum-cloud.uk/whzm4';
    $apiKey = '21screaM715525';

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $zpl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return [
            'success' => false,
            'message' => 'cURL error: ' . $error
        ];
    }

    if ($httpCode >= 200 && $httpCode < 300) {
        return [
            'success' => true,
            'message' => 'Label sent to cloud printer'
        ];
    } else {
        return [
            'success' => false,
            'message' => 'HTTP error ' . $httpCode . ': ' . $response
        ];
    }
}

/**
 * Print label via local server
 */
function printLabelLocal($zpl) {
    $url = 'http://raspberrypi.local:5000/whzm4';
    $apiKey = '21screaM715525';

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $zpl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return [
            'success' => false,
            'message' => 'cURL error: ' . $error
        ];
    }

    if ($httpCode >= 200 && $httpCode < 300) {
        return [
            'success' => true,
            'message' => 'Label sent to local printer'
        ];
    } else {
        return [
            'success' => false,
            'message' => 'HTTP error ' . $httpCode . ': ' . $response
        ];
    }
}

/**
 * Lookup device information from database
 *
 * @param mysqli $conn Database connection
 * @param string $imei IMEI number
 * @return array|null Device data or null if not found
 */
function lookupDeviceInfo($conn, $imei) {
    $imei = mysqli_real_escape_string($conn, trim($imei));

    $sql = "SELECT * FROM v_imei_lookup WHERE item_imei = '{$imei}'";
    $result = mysqli_query($conn, $sql);

    if (!$result) {
        error_log("SQL Error in lookupDeviceInfo: " . mysqli_error($conn));
        error_log("SQL Query: " . $sql);
        return null;
    }

    $data = mysqli_fetch_assoc($result);
    mysqli_free_result($result);

    // Return false if no data found (instead of null which is ambiguous)
    if (!$data) {
        return false;
    }

    return $data;
}

/**
 * Format device info for display
 */
function formatDeviceInfo($deviceData) {
    if (!$deviceData) {
        return 'Unknown Device';
    }

    $info = sprintf(
        '%s %s %sGb %s',
        $deviceData['brand_name'],
        $deviceData['model_name'],
        $deviceData['item_gb'],
        $deviceData['item_color']
    );

    // Only include grade if it has a meaningful value
    $grade = isset($deviceData['grade_title']) ? trim($deviceData['grade_title']) : '';
    if (!empty($grade) && $grade !== 'N/A' && $grade !== 'Unknown') {
        $info .= ' Grade ' . $grade;
    }

    return $info;
}
