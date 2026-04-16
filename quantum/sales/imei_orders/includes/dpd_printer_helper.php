<?php
// Ensure session is available for per-user printer selection
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Fetch an env value with fallbacks.
 */
function dpdEnvValue($key, $default = null) {
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }
    $value = getenv($key);
    return ($value !== false && $value !== '') ? $value : $default;
}

/**
 * Allowed DPD printer endpoints (DPD templates only).
 */
function getDpdPrinterOptions() {
    return [
        'whcitizendpd' => 'Citizen DPD Template',
        'whzm600dpd' => 'ZM600 DPD Template',
    ];
}

/**
 * Map a DPD template endpoint key to its full URL (new split print servers).
 */
function getDpdPrinterUrl($endpoint) {
    $endpoint = ltrim((string)$endpoint, '/');

    $map = [
        'whzm600dpd' => 'https://whprint.quantum-cloud.uk/whzm600dpd',
        'whcitizendpd' => 'https://zebra.quantum-cloud.co.uk/whcitizendpd',
    ];

    return $map[$endpoint] ?? null;
}

/**
 * Resolve and persist the DPD printer endpoint for this session.
 */
function resolveDpdPrinter($requested = null) {
    $options = getDpdPrinterOptions();
    $allowed = array_keys($options);

    if ($requested && in_array($requested, $allowed, true)) {
        $_SESSION['dpd_printer_endpoint'] = $requested;
        return $requested;
    }

    if (isset($_SESSION['dpd_printer_endpoint']) && in_array($_SESSION['dpd_printer_endpoint'], $allowed, true)) {
        return $_SESSION['dpd_printer_endpoint'];
    }

    $default = dpdEnvValue('DPD_PRINTER_DEFAULT_ENDPOINT', 'whcitizendpd');
    if (!in_array($default, $allowed, true)) {
        $default = 'whcitizendpd';
    }

    $_SESSION['dpd_printer_endpoint'] = $default;
    return $default;
}

/**
 * Build print server config for the chosen DPD endpoint.
 */
function getDpdPrinterConfig($endpoint = null) {
    $selected = resolveDpdPrinter($endpoint);
    $apiKey = dpdEnvValue('PRINTSERVER_API_KEY', dpdEnvValue('PRINT_API_KEY'));

    if (!$apiKey) {
        return ['success' => false, 'message' => 'Print server API key is not configured.'];
    }

    $url = getDpdPrinterUrl($selected);
    if (!$url) {
        // Backwards-compatible fallback if a custom endpoint is used.
        $baseUrl = dpdEnvValue('PRINTSERVER_BASE_URL', dpdEnvValue('PRINT_WEBHOOK_URL'));
        if (!$baseUrl) {
            return ['success' => false, 'message' => 'Print server URL is not configured.'];
        }
        $url = rtrim($baseUrl, '/') . '/' . ltrim($selected, '/');
    }

    return [
        'success' => true,
        'url' => $url,
        'api_key' => $apiKey,
        'endpoint' => $selected,
    ];
}

/**
 * Allowed delivery note printer endpoints (PDF).
 */
function getBmDeliveryNotePrinterOptions() {
    return [
        'laserleft' => 'Laser (Left)',
        'laserright' => 'Laser (Right)',
        'lasernew' => 'WH Laser New',
    ];
}

/**
 * Map the delivery note printer endpoint to its full URL.
 */
function getBmDeliveryNotePrinterUrl($endpoint) {
    $endpoint = ltrim((string)$endpoint, '/');

    $map = [
        'laserleft' => 'https://whprint.quantum-cloud.uk/laserleft',
        'laserright' => 'https://whprint.quantum-cloud.uk/laserright',
        'lasernew' => 'https://whprint.quantum-cloud.uk/lasernew',
    ];

    return $map[$endpoint] ?? null;
}

/**
 * Resolve and persist the delivery note printer endpoint for this session.
 */
function resolveBmDeliveryNotePrinter($requested = null) {
    $options = getBmDeliveryNotePrinterOptions();
    $allowed = array_keys($options);

    if ($requested && in_array($requested, $allowed, true)) {
        $_SESSION['bm_delivery_note_printer_endpoint'] = $requested;
        return $requested;
    }

    if (isset($_SESSION['bm_delivery_note_printer_endpoint']) && in_array($_SESSION['bm_delivery_note_printer_endpoint'], $allowed, true)) {
        return $_SESSION['bm_delivery_note_printer_endpoint'];
    }

    $default = dpdEnvValue('BM_DELIVERY_NOTE_PRINTER_DEFAULT_ENDPOINT', 'laserleft');
    if (!in_array($default, $allowed, true)) {
        $default = 'laserleft';
    }

    $_SESSION['bm_delivery_note_printer_endpoint'] = $default;
    return $default;
}

/**
 * Build print server config for the chosen delivery note printer.
 */
function getBmDeliveryNotePrinterConfig($endpoint = null) {
    $selected = resolveBmDeliveryNotePrinter($endpoint);
    $apiKey = dpdEnvValue('LASER_API_KEY', dpdEnvValue('PRINT_API_KEY'));

    if (!$apiKey) {
        return ['success' => false, 'message' => 'Laser print API key is not configured.'];
    }

    $url = getBmDeliveryNotePrinterUrl($selected);
    if (!$url) {
        return ['success' => false, 'message' => 'Invalid delivery note printer endpoint.'];
    }

    return [
        'success' => true,
        'url' => $url,
        'api_key' => $apiKey,
        'endpoint' => $selected,
    ];
}
