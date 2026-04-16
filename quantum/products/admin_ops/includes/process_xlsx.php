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

$mode = isset($_POST['mode']) ? trim($_POST['mode']) : 'cloud';
$requestedEndpoint = isset($_POST['endpoint']) ? trim($_POST['endpoint']) : null;
$availableEndpoints = getAvailablePrintEndpoints();

if ($requestedEndpoint && !array_key_exists($requestedEndpoint, $availableEndpoints)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid printer selection.'
    ]);
    exit;
}

$selectedEndpoint = resolvePrintEndpoint($requestedEndpoint);

// Check if file was uploaded
if (!isset($_FILES['xlsx_file']) || $_FILES['xlsx_file']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode([
        'success' => false,
        'message' => 'No file uploaded or upload error occurred.'
    ]);
    exit;
}

$file = $_FILES['xlsx_file'];

// Check file extension
$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($fileExt !== 'xlsx') {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid file type. Only XLSX files are allowed.'
    ]);
    exit;
}

// Try to use PhpSpreadsheet if available, otherwise fall back to XML parsing
$imeiList = [];

if (class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
    // Use PhpSpreadsheet
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file['tmp_name']);
        $worksheet = $spreadsheet->getActiveSheet();

        foreach ($worksheet->getRowIterator() as $row) {
            $cellIterator = $row->getCellIterator();
            $cellIterator->setIterateOnlyExistingCells(false);

            $colIndex = 0;
            foreach ($cellIterator as $cell) {
                if ($colIndex === 1) { // Second column (0-indexed)
                    $value = trim($cell->getValue());
                    if (preg_match('/^\d{15}$/', $value)) {
                        $imeiList[] = $value;
                    }
                    break;
                }
                $colIndex++;
            }
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error reading XLSX file: ' . $e->getMessage()
        ]);
        exit;
    }
} else {
    // Fall back to simple XML parsing
    $imeiList = parseXlsxSimple($file['tmp_name']);

    if ($imeiList === false) {
        echo json_encode([
            'success' => false,
            'message' => 'Unable to parse XLSX file. Please ensure it is a valid Excel file.'
        ]);
        exit;
    }
}

if (empty($imeiList)) {
    echo json_encode([
        'success' => false,
        'message' => 'No valid IMEI numbers found in column 2 of XLSX file.'
    ]);
    exit;
}

// Switch to s4d_england_db for device lookup
mysqli_select_db($conn, 's4d_england_db');

// Process each IMEI and print labels
$printed = 0;
$failed = 0;
$errors = [];

foreach ($imeiList as $imei) {
    // Lookup device info
    $deviceData = lookupDeviceInfo($conn, $imei);

    if (!$deviceData) {
        $failed++;
        $errors[] = "IMEI {$imei}: Not found in database";
        continue;
    }

    if (empty($deviceData['brand_name']) || empty($deviceData['model_name'])) {
        $failed++;
        $errors[] = "IMEI {$imei}: Incomplete device data";
        continue;
    }

    // Generate ZPL
    $zpl = generateZPL(
        $deviceData['brand_name'],
        $deviceData['model_name'],
        $deviceData['item_gb'] ?? '0',
        $deviceData['item_color'] ?? 'Unknown',
        $deviceData['grade_title'] ?? 'N/A',
        $imei
    );

    // Print label
    $printResult = printLabel($zpl, $mode, $selectedEndpoint);

    if ($printResult['success']) {
        $printed++;
    } else {
        $failed++;
        $errors[] = "IMEI {$imei}: " . $printResult['message'];
    }

    // Small delay to avoid overwhelming the printer
    usleep(100000); // 100ms
}

echo json_encode([
    'success' => true,
    'message' => "Processed {$printed} labels successfully, {$failed} failed.",
    'printed' => $printed,
    'failed' => $failed,
    'errors' => $errors
]);

/**
 * Simple XLSX parser using ZIP and XML
 * Extracts values from column B (2nd column)
 */
function parseXlsxSimple($filePath) {
    $zip = new ZipArchive;

    if ($zip->open($filePath) !== true) {
        return false;
    }

    // Read shared strings if they exist
    $sharedStrings = [];
    if ($zip->locateName('xl/sharedStrings.xml') !== false) {
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml) {
            $xml = simplexml_load_string($sharedStringsXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    $sharedStrings[] = (string)$si->t;
                }
            }
        }
    }

    // Read worksheet data
    $worksheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();

    if (!$worksheetXml) {
        return false;
    }

    $xml = simplexml_load_string($worksheetXml);
    if (!$xml) {
        return false;
    }

    $imeiList = [];

    // Parse rows
    foreach ($xml->sheetData->row as $row) {
        foreach ($row->c as $cell) {
            $cellRef = (string)$cell['r'];

            // Check if this is column B (2nd column)
            if (preg_match('/^B\d+$/', $cellRef)) {
                $value = '';

                if (isset($cell->v)) {
                    $cellValue = (string)$cell->v;

                    // Check if it's a shared string reference
                    if (isset($cell['t']) && (string)$cell['t'] === 's') {
                        $index = intval($cellValue);
                        if (isset($sharedStrings[$index])) {
                            $value = $sharedStrings[$index];
                        }
                    } else {
                        $value = $cellValue;
                    }
                }

                // Validate and add IMEI
                $value = trim($value);
                if (preg_match('/^\d{15}$/', $value)) {
                    $imeiList[] = $value;
                }

                break; // Move to next row
            }
        }
    }

    return $imeiList;
}
