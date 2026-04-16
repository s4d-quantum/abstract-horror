<?php include '../../db_config.php'; ?>
<?php include "../../authenticate.php"; ?>
<?php $global_url = "../../"; ?>

<?php
// Include PhpSpreadsheet for XLSX support
require_once __DIR__ . '/../../vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;
$colorCheckConfig = [
  'local_api_base' => isset($_ENV['COLOR_CHECK_LOCAL_API_BASE']) && $_ENV['COLOR_CHECK_LOCAL_API_BASE'] !== ''
    ? rtrim($_ENV['COLOR_CHECK_LOCAL_API_BASE'], '/')
    : 'http://216.205.173.69:3000',
  'local_api_timeout' => isset($_ENV['COLOR_CHECK_LOCAL_API_TIMEOUT'])
    ? (int)$_ENV['COLOR_CHECK_LOCAL_API_TIMEOUT']
    : 15,
  'external_endpoint' => $_ENV['COLOR_CHECK_EXTERNAL_ENDPOINT'] ?? 'https://pro.imei24.com/apii.php',
  'external_login' => $_ENV['COLOR_CHECK_EXTERNAL_LOGIN'] ?? '',
  'external_key' => $_ENV['COLOR_CHECK_EXTERNAL_KEY'] ?? '',
  'external_service_id' => isset($_ENV['COLOR_CHECK_EXTERNAL_SERVICE_ID'])
    ? (int)$_ENV['COLOR_CHECK_EXTERNAL_SERVICE_ID']
    : 487,
  'external_timeout' => isset($_ENV['COLOR_CHECK_EXTERNAL_TIMEOUT'])
    ? (int)$_ENV['COLOR_CHECK_EXTERNAL_TIMEOUT']
    : 30,
];

$messages = [];
$errors = [];
$results = [];
$rawInput = isset($_POST['imeis']) ? (string)$_POST['imeis'] : '';
$statistics = [
  'total' => 0,
  'internal_api' => 0,
  'external_api' => 0,
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $collected = collectImeis($errors);
  $orderedImeis = $collected['ordered'];

  if (empty($orderedImeis) && empty($errors)) {
    $errors[] = 'No IMEI numbers were supplied.';
  }

  if (!empty($orderedImeis)) {
    $processedCache = [];
    foreach ($orderedImeis as $imei) {
      if (isset($processedCache[$imei])) {
        $cached = $processedCache[$imei];
        $cached['duplicate'] = true;
        $results[] = $cached;
        continue;
      }

      $result = processImei($imei, $colorCheckConfig);
      $processedCache[$imei] = $result;
      $results[] = $result;
      
      // Track statistics
      $statistics['total']++;
      if ($result['source'] === 'Local cache') {
        $statistics['internal_api']++;
      } elseif ($result['source'] === 'External API') {
        $statistics['external_api']++;
      }
    }
  }

  if (!empty($collected['skipped'])) {
    $messages[] = sprintf(
      'Skipped %d invalid entr%s: %s',
      count($collected['skipped']),
      count($collected['skipped']) === 1 ? 'y' : 'ies',
      implode(', ', $collected['skipped'])
    );
  }
}

function processImei(string $imei, array $config): array
{
  $result = [
    'imei' => $imei,
    'color' => null,
    'purchase_color' => null, // Store the purchase color from the database
    'source' => null,
    'status' => '',
    'notes' => [],
    'error' => null,
    'duplicate' => false,
    'details' => [],
    'stored' => null,
  ];

  // Fetch purchase color from the database
  $purchaseColor = getPurchaseColorFromDB($imei);
  $result['purchase_color'] = $purchaseColor;

  $local = fetchLocalRecord($imei, $config);
  if ($local['success'] && !empty($local['data'])) {
    $localDetails = normalizeDeviceDetails($local['data']);
    $result['details'] = $localDetails;

    $localColor = $localDetails['color'] ?? null;
    if (is_string($localColor)) {
      $localColor = trim($localColor);
      if ($localColor === '') {
        $localColor = null;
      }
    }

    if ($localColor !== null) {
      $result['color'] = $localColor;
      $result['source'] = 'Local cache';
      $result['status'] = 'Found in local cache';
      updateOemColorInDB($imei, $localColor);
      return $result;
    }

    $result['notes'][] = 'Local cache did not have color information.';
  } elseif (!$local['success'] && $local['message'] !== '') {
    $result['notes'][] = 'Local lookup failed: ' . $local['message'];
  }

  $external = fetchExternalData($imei, $config);
  if (!$external['success']) {
    $result['error'] = $external['message'];
    $result['status'] = 'External lookup failed';
    $result['source'] = 'External API';
    return $result;
  }

  $externalDetails = normalizeDeviceDetails($external['data']);
  $result['details'] = $externalDetails;

  $result['color'] = isset($externalDetails['color']) ? $externalDetails['color'] : null;
  if (is_string($result['color'])) {
    $result['color'] = trim($result['color']);
    if ($result['color'] === '') {
      $result['color'] = null;
    }
  }
  
  $result['source'] = 'External API';
  $result['status'] = 'Fetched from external API';
  if (isset($external['credits'])) {
    $result['notes'][] = 'Credits used: ' . $external['credits'];
  }

  if ($result['color'] !== null) {
    updateOemColorInDB($imei, $result['color']);
  }

  $storeOutcome = storeInLocalCache($externalDetails, $config);
  if ($storeOutcome['success']) {
    $result['stored'] = 'stored';
    $result['notes'][] = 'Stored in local cache.';
  } elseif ($storeOutcome['message'] !== '') {
    $result['stored'] = 'failed';
    $result['notes'][] = 'Failed to store locally: ' . $storeOutcome['message'];
  }

  return $result;
}

function collectImeis(array &$errors): array
{
  $ordered = [];
  $skipped = [];

  if (!empty($_POST['imeis'])) {
    $manual = (string)$_POST['imeis'];
    $candidates = preg_split('/[\s,;]+/', $manual);
    if (is_array($candidates)) {
      foreach ($candidates as $candidate) {
        $candidate = trim($candidate);
        if ($candidate === '') {
          continue;
        }
        $normalized = normalizeImei($candidate);
        if ($normalized === null) {
          $skipped[] = $candidate;
          continue;
        }
        $ordered[] = $normalized;
      }
    }
  }

  if (
    isset($_FILES['imei_file']) &&
    is_array($_FILES['imei_file']) &&
    isset($_FILES['imei_file']['error']) &&
    $_FILES['imei_file']['error'] !== UPLOAD_ERR_NO_FILE
  ) {
    if ($_FILES['imei_file']['error'] !== UPLOAD_ERR_OK) {
      $errors[] = 'Failed to upload file (error code ' . (int)$_FILES['imei_file']['error'] . ').';
    } else {
      $filename = $_FILES['imei_file']['name'];
      $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
      
      if ($extension === 'csv') {
        $fileImeis = parseCsvForImeis($_FILES['imei_file']['tmp_name'], $skipped);
        $ordered = array_merge($ordered, $fileImeis);
      } elseif ($extension === 'xlsx') {
        $fileImeis = parseXlsxForImeis($_FILES['imei_file']['tmp_name'], $skipped);
        if (empty($fileImeis) && empty($skipped)) {
          $errors[] = 'Failed to read XLSX file. Please ensure the file is a valid Excel file.';
        } else {
          $ordered = array_merge($ordered, $fileImeis);
        }
      } else {
        $errors[] = 'Unsupported file type. Please upload a CSV or XLSX file.';
      }
    }
  }

  return [
    'ordered' => $ordered,
    'skipped' => $skipped,
  ];
}

function normalizeImei(string $raw): ?string
{
  $digits = preg_replace('/\D+/', '', $raw);
  if ($digits === null) {
    return null;
  }
  $length = strlen($digits);
  if ($length < 14 || $length > 17) {
    return null;
  }
  return $digits;
}

function parseCsvForImeis(string $path, array &$skipped): array
{
  $imeis = [];
  $handle = @fopen($path, 'rb');
  if ($handle === false) {
    return $imeis;
  }

  $rowNumber = 0;
  while (($row = fgetcsv($handle)) !== false) {
    $rowNumber++;
    if (!is_array($row)) {
      continue;
    }

    // Only read from column B (index 1)
    if (!isset($row[1])) {
      continue;
    }
    
    $column = trim((string)$row[1]);
    if ($column === '') {
      continue;
    }
    
    // Skip header row if it contains 'imei' text without digits
    if ($rowNumber === 1 && stripos($column, 'imei') !== false && !preg_match('/\d/', $column)) {
      continue;
    }
    
    $normalized = normalizeImei($column);
    if ($normalized === null) {
      $skipped[] = $column;
      continue;
    }
    $imeis[] = $normalized;
  }

  fclose($handle);
  return $imeis;
}

function parseXlsxForImeis(string $path, array &$skipped): array
{
  $imeis = [];
  
  try {
    $spreadsheet = IOFactory::load($path);
    $worksheet = $spreadsheet->getActiveSheet();
    $highestRow = $worksheet->getHighestRow();
    
    // Start from row 1, read column B (index 2 in PhpSpreadsheet, which uses 1-based indexing)
    for ($row = 1; $row <= $highestRow; $row++) {
      $cellValue = $worksheet->getCell('B' . $row)->getValue();
      
      if ($cellValue === null || $cellValue === '') {
        continue;
      }
      
      $column = trim((string)$cellValue);
      if ($column === '') {
        continue;
      }
      
      // Skip header row if it contains 'imei' text without digits
      if ($row === 1 && stripos($column, 'imei') !== false && !preg_match('/\d/', $column)) {
        continue;
      }
      
      $normalized = normalizeImei($column);
      if ($normalized === null) {
        $skipped[] = $column;
        continue;
      }
      $imeis[] = $normalized;
    }
  } catch (Exception $e) {
    // If there's an error loading the file, return empty array
    // Error will be handled by the calling function
    return [];
  }
  
  return $imeis;
}

function fetchLocalRecord(string $imei, array $config): array
{
  if ($config['local_api_base'] === '') {
    return [
      'success' => false,
      'data' => [],
      'message' => 'Local API is not configured.',
    ];
  }

  $url = $config['local_api_base'] . '/api/imei/' . rawurlencode($imei);
  $response = httpGetJson($url, $config['local_api_timeout']);
  if (!$response['success']) {
    return [
      'success' => false,
      'message' => $response['message'],
      'data' => [],
    ];
  }

  $data = $response['data'];
  if (!is_array($data)) {
    return [
      'success' => false,
      'message' => 'Local API returned unexpected payload.',
      'data' => [],
    ];
  }

  if (isset($data['error'])) {
    $message = trim((string)$data['error']);
    if ($message === '') {
      $message = 'Local API returned an error.';
    }
    return [
      'success' => false,
      'message' => $message,
      'data' => [],
    ];
  }

  return [
    'success' => true,
    'data' => $data,
    'message' => '',
  ];
}

function fetchExternalData(string $imei, array $config): array
{
  if ($config['external_endpoint'] === '' || $config['external_login'] === '' || $config['external_key'] === '') {
    return [
      'success' => false,
      'message' => 'External API credentials are not configured.',
    ];
  }

  $query = http_build_query([
    'login' => $config['external_login'],
    'apikey' => $config['external_key'],
    'action' => 'placeorder',
    'imei' => $imei,
    'id' => $config['external_service_id'],
  ]);

  $url = $config['external_endpoint'] . '?' . $query;
  $ch = curl_init($url);
  if ($ch === false) {
    return [
      'success' => false,
      'message' => 'Unable to initialise cURL for external request.',
    ];
  }

  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, $config['external_timeout']);

  $body = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    return [
      'success' => false,
      'message' => 'External request failed: ' . $curlError,
    ];
  }

  if ($httpCode >= 400) {
    return [
      'success' => false,
      'message' => 'External API responded with HTTP ' . $httpCode,
    ];
  }

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) {
    return [
      'success' => false,
      'message' => 'External API returned unexpected response.',
    ];
  }

  if (!isset($decoded['STATUS']) || strtolower((string)$decoded['STATUS']) !== 'ok') {
    $message = isset($decoded['MESSAGE']) ? (string)$decoded['MESSAGE'] : 'Unknown error from external API.';
    return [
      'success' => false,
      'message' => $message,
    ];
  }

  $parsed = [];
  if (isset($decoded['RESULTS'])) {
    $parsed = parseExternalResults((string)$decoded['RESULTS']);
  }

  if (!isset($parsed['imei_1']) || $parsed['imei_1'] === '') {
    $parsed['imei_1'] = $imei;
  }

  $credits = isset($decoded['CREDIT']) ? (string)$decoded['CREDIT'] : null;
  if (isset($credits)) {
    $parsed['credits'] = $credits;
  }

  return [
    'success' => true,
    'data' => $parsed,
    'message' => '',
    'credits' => $credits,
  ];
}

function storeInLocalCache(array $data, array $config): array
{
  if ($config['local_api_base'] === '') {
    return [
      'success' => false,
      'message' => 'Local API is not configured.',
    ];
  }

  if (empty($data['imei_1'])) {
    return [
      'success' => false,
      'message' => 'External response did not include a primary IMEI.',
    ];
  }

  $payload = [
    'imei_1' => $data['imei_1'] ?? null,
    'imei_2' => $data['imei_2'] ?? null,
    'serial_number' => $data['serial_number'] ?? null,
    'model_info' => $data['model_info'] ?? null,
    'model_name' => $data['model_name'] ?? null,
    'model_number' => $data['model_number'] ?? null,
    'color' => $data['color'] ?? null,
    'warranty_status' => $data['warranty_status'] ?? null,
    'estimated_warranty_end_date' => normalizeDateValue($data['estimated_warranty_end_date'] ?? null),
    'production_location' => $data['production_location'] ?? null,
    'production_date' => normalizeDateValue($data['production_date'] ?? null),
    'country_and_carrier' => $data['country_and_carrier'] ?? null,
    'credits' => isset($data['credits']) ? (float)$data['credits'] : null,
  ];

  $response = httpPostJson($config['local_api_base'] . '/api/imei', $payload, $config['local_api_timeout']);
  if ($response['success']) {
    return [
      'success' => true,
      'message' => '',
    ];
  }

  $message = $response['message'] !== '' ? $response['message'] : 'HTTP ' . $response['http_code'];
  return [
    'success' => false,
    'message' => $message,
  ];
}

function httpGetJson(string $url, int $timeout): array
{
  $ch = curl_init($url);
  if ($ch === false) {
    return [
      'success' => false,
      'message' => 'Unable to initialise cURL.',
    ];
  }

  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

  $body = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    return [
      'success' => false,
      'message' => $curlError === '' ? 'Request failed.' : $curlError,
    ];
  }

  if ($httpCode >= 400) {
    return [
      'success' => false,
      'message' => 'HTTP ' . $httpCode,
    ];
  }

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) {
    return [
      'success' => false,
      'message' => 'Invalid JSON response.',
    ];
  }

  return [
    'success' => true,
    'data' => $decoded,
    'message' => '',
  ];
}

function httpPostJson(string $url, array $payload, int $timeout): array
{
  $ch = curl_init($url);
  if ($ch === false) {
    return [
      'success' => false,
      'message' => 'Unable to initialise cURL.',
      'http_code' => 0,
    ];
  }

  $json = json_encode($payload);
  if ($json === false) {
    curl_close($ch);
    return [
      'success' => false,
      'message' => 'Failed to encode payload as JSON.',
      'http_code' => 0,
    ];
  }

  curl_setopt($ch, CURLOPT_POST, true);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $json);

  $body = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($body === false) {
    return [
      'success' => false,
      'message' => $curlError === '' ? 'Request failed.' : $curlError,
      'http_code' => $httpCode,
    ];
  }

  $decoded = json_decode($body, true);
  if (!is_array($decoded)) {
    $decoded = [];
  }

  $success = $httpCode >= 200 && $httpCode < 300;

  $message = '';
  if (isset($decoded['error'])) {
    $message = (string)$decoded['error'];
  } elseif (!$success) {
    $message = 'HTTP ' . $httpCode;
  }

  return [
    'success' => $success,
    'data' => $decoded,
    'message' => $message,
    'http_code' => $httpCode,
  ];
}

function parseExternalResults(string $results): array
{
  $normalized = str_ireplace(['<br />', '<br/>', '<br>', '<BR />', '<BR/>', '<BR>'], "\n", $results);
  $normalized = strip_tags($normalized);

  $lines = preg_split("/\r\n|\n|\r/", $normalized);
  if ($lines === false) {
    $lines = [];
  }

  $parsed = [];
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '') {
      continue;
    }

    $parts = preg_split('/[:;]+/', $line, 2);
    if (!is_array($parts) || count($parts) !== 2) {
      continue;
    }

    $key = normalizeResultKey($parts[0]);
    if ($key === '') {
      continue;
    }
    $value = trim($parts[1]);
    $parsed[$key] = $value;
  }

  return $parsed;
}

function normalizeDeviceDetails(array $data): array
{
  $normalized = [];
  foreach ($data as $key => $value) {
    if (!is_string($key)) {
      continue;
    }
    $normalizedKey = normalizeResultKey($key);
    if ($normalizedKey === '') {
      continue;
    }
    if (is_string($value)) {
      $value = trim($value);
    }
    $normalized[$normalizedKey] = $value;
  }
  return $normalized;
}

function normalizeResultKey(string $key): string
{
  $key = strtolower($key);
  $key = preg_replace('/[^a-z0-9]+/', '_', $key);
  if ($key === null) {
    return '';
  }
  return trim($key, '_');
}

function normalizeDateValue(?string $value): ?string
{
  if ($value === null) {
    return null;
  }

  $value = trim($value);
  if ($value === '' || strtolower($value) === 'null') {
    return null;
  }

  $value = str_replace('/', '-', $value);
  $formats = ['d-m-Y', 'Y-m-d', 'd.m.Y', 'Y.m.d', 'm-d-Y', 'm/d/Y'];

  foreach ($formats as $format) {
    $dt = DateTime::createFromFormat($format, $value);
    if ($dt instanceof DateTime && $dt->format($format) === $value) {
      return $dt->format('Y-m-d');
    }
  }

  return null;
}

function getPurchaseColorFromDB(string $imei): ?string
{
  global $conn; // Use the existing database connection
  
  $query = "SELECT item_color FROM tbl_imei WHERE item_imei = ?";
  $stmt = mysqli_prepare($conn, $query);
  
  if ($stmt) {
    mysqli_stmt_bind_param($stmt, "s", $imei);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    if ($row = mysqli_fetch_assoc($result)) {
      $color = $row['item_color'] ?? null;
      if (is_string($color)) {
        $color = trim($color);
        if ($color === '') {
          $color = null;
        }
      }
      mysqli_stmt_close($stmt);
      return $color;
    }
    
    mysqli_stmt_close($stmt);
  }
  
  // If query fails or no result, return null
  return null;
}

function updateOemColorInDB(string $imei, string $color): void
{
  global $conn;

  $normalizedColor = trim($color);
  if ($normalizedColor === '') {
    return;
  }

  $query = "UPDATE tbl_imei SET oem_color = ? WHERE item_imei = ?";
  $stmt = mysqli_prepare($conn, $query);
  if (!$stmt) {
    return;
  }

  mysqli_stmt_bind_param($stmt, "ss", $normalizedColor, $imei);
  mysqli_stmt_execute($stmt);
  mysqli_stmt_close($stmt);
}
?>
<?php include "../../header.php"; ?>

<div class="content-wrapper">
  <section class="content-header">
    <h1>Color Check</h1>
  </section>
  <section class="content">
    <div class="row">
      <div class="col-xs-12">
        <section class="content">
          <div class="row">
            <div class="col-xs-12">
              <div class="box">
                <div class="box-header">
                  <h3 class="box-title">Lookup IMEI Colours</h3>
                </div>
                <form method="post" enctype="multipart/form-data">
                  <div class="box-body">
                    <div class="form-group">
                      <label for="imeis">IMEI numbers (one per line, comma, or space separated)</label>
                      <textarea class="form-control" id="imeis" name="imeis" rows="6" placeholder="Enter IMEI numbers here..."><?php echo htmlspecialchars($rawInput); ?></textarea>
                    </div>
                    <div class="form-group">
                      <label for="imei_file">Or upload a CSV or XLSX file (IMEIs in Column B)</label>
                      <input type="file" class="form-control" name="imei_file" id="imei_file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">
                      <p class="help-block">Upload a CSV or XLSX file with IMEI numbers in column B</p>
                    </div>
                  </div>
                  <div class="box-footer">
                    <button type="submit" class="btn btn-primary">Lookup IMEI Details</button>
                    <button type="button" class="btn btn-info" data-toggle="modal" data-target="#inventorySearchModal">Inventory Search</button>
                    <a href="index.php" class="btn btn-default">Back to Admin Ops</a>
                  </div>
                </form>
                
                <!-- Form for inventory search results -->
                <form method="post" enctype="multipart/form-data" id="inventory-check-form">
                  <input type="hidden" name="imeis" id="inventory-imeis-input" value="">
                  <div class="box-footer" id="inventory-check-footer" style="display:none;">
                    <button type="button" class="btn btn-success" onclick="runColorCheck()">Run Check</button>
                    <button type="button" class="btn btn-warning" onclick="clearInventoryCheck()">Clear Selection</button>
                  </div>
                </form>
              </div>

              <?php if (!empty($messages)): ?>
                <div class="alert alert-info">
                  <?php foreach ($messages as $message): ?>
                    <div><?php echo htmlspecialchars($message); ?></div>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>

              <?php if (!empty($errors)): ?>
                <div class="alert alert-danger">
                  <?php foreach ($errors as $error): ?>
                    <div><?php echo htmlspecialchars($error); ?></div>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>

              <?php if (!empty($results)): ?>
                <div class="box">
                  <div class="box-header">
                    <h3 class="box-title">Results</h3>
                  </div>
                  <div class="box-body table-responsive">
                    <table class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>IMEI</th>
                          <th>Color</th>
                          <th>Purchase Color</th>
                          <th>Model Info</th>
                          <th>Model Number</th>
                          <th>Source</th>
                          <th>Status</th>
                          <th>Notes</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tfoot>
                        <tr>
                          <td colspan="9">
                            <button class="btn btn-success exportexcel" name="export-to-excel" style="margin-right:10px;">
                              <i class="fa fa-download"></i> Export to Excel
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                      <tbody>
                        <?php foreach ($results as $row): ?>
                          <tr>
                            <td style="min-width:140px;">
                              <?php echo htmlspecialchars($row['imei']); ?>
                              <?php if ($row['duplicate']): ?>
                                <div class="text-muted small">(duplicate entry, reused previous result)</div>
                              <?php endif; ?>
                            </td>
                            <td><?php echo htmlspecialchars($row['color'] !== null ? $row['color'] : ''); ?></td>
                            <td><?php echo htmlspecialchars($row['purchase_color'] !== null ? $row['purchase_color'] : ''); ?></td>
                            <td><?php echo htmlspecialchars($row['details']['model_info'] ?? ''); ?></td>
                            <td><?php echo htmlspecialchars($row['details']['model_number'] ?? ''); ?></td>
                            <td><?php echo htmlspecialchars($row['source'] ?? ''); ?></td>
                            <td>
                              <?php
                                $statusClass = '';
                                if ($row['error'] !== null) {
                                  $statusClass = 'text-danger';
                                } elseif ($row['color'] !== null) {
                                  $statusClass = 'text-success';
                                }
                              ?>
                              <span class="<?php echo $statusClass; ?>">
                                <?php echo htmlspecialchars($row['status']); ?>
                              </span>
                              <?php if ($row['stored'] === 'stored'): ?>
                                <div class="text-muted small">Cached locally.</div>
                              <?php elseif ($row['stored'] === 'failed'): ?>
                                <div class="text-muted small">Local cache update failed.</div>
                              <?php endif; ?>
                            </td>
                            <td>
                              <?php
                                if ($row['error'] !== null) {
                                  echo htmlspecialchars($row['error']);
                                } elseif (!empty($row['notes'])) {
                                  echo htmlspecialchars(implode(' | ', $row['notes']));
                                }
                              ?>
                            </td>
                            <td>
                              <?php
                                if (!empty($row['details'])) {
                                  $detailLines = [];
                                  $keysToShow = [
                                    'model_name' => 'Model Name',
                                    'model_number' => 'Model Number',
                                    'model_info' => 'Model Info',
                                    'warranty_status' => 'Warranty Status',
                                    'estimated_warranty_end_date' => 'Warranty End Date',
                                    'production_location' => 'Production Location',
                                    'production_date' => 'Production Date',
                                    'country_and_carrier' => 'Country / Carrier',
                                    'serial_number' => 'Serial Number',
                                  ];
                                  foreach ($keysToShow as $key => $label) {
                                    if (isset($row['details'][$key]) && $row['details'][$key] !== '') {
                                      $detailLines[] = $label . ': ' . $row['details'][$key];
                                    }
                                  }
                                  echo htmlspecialchars(implode("; ", $detailLines));
                                }
                              ?>
                            </td>
                          </tr>
                        <?php endforeach; ?>
                      </tbody>
                    </table>
                  </div>
                  
                  <!-- Summary Statistics Section -->
                  <?php if (!empty($results)): ?>
                    <div class="box-footer">
                      <h4>Summary Statistics</h4>
                      <div class="row">
                        <div class="col-md-4">
                          <div class="info-box bg-aqua">
                            <span class="info-box-icon"><i class="fa fa-list"></i></span>
                            <div class="info-box-content">
                              <span class="info-box-text">Total IMEIs Checked</span>
                              <span class="info-box-number"><?php echo $statistics['total']; ?></span>
                            </div>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="info-box bg-green">
                            <span class="info-box-icon"><i class="fa fa-database"></i></span>
                            <div class="info-box-content">
                              <span class="info-box-text">Internal API (Cached)</span>
                              <span class="info-box-number"><?php echo $statistics['internal_api']; ?></span>
                            </div>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="info-box bg-yellow">
                            <span class="info-box-icon"><i class="fa fa-cloud"></i></span>
                            <div class="info-box-content">
                              <span class="info-box-text">External API (Fetched)</span>
                              <span class="info-box-number"><?php echo $statistics['external_api']; ?></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  <?php endif; ?>
                </div>
              <?php endif; ?>

              <!-- Hidden form for Excel export -->
              <form id="exportForm" method="post" action="includes/export_color_check_results.php" style="display:none;">
                <input type="hidden" name="color_check_results" id="colorCheckResultsInput" value="">
              </form>

            </div>
          </div>
        </section>
      </div>
    </div>
  </section>
</div>

<?php include "inventory_search_modal.php"; ?>
<?php include $global_url . "footer.php"; ?>

<script>
// Add event listener to the export button
document.addEventListener('DOMContentLoaded', function() {
  const exportButton = document.querySelector('.exportexcel');
  if (exportButton) {
    exportButton.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get all the results data from the page
      const resultsData = <?php echo json_encode($results); ?>;
      
      // Set the results data in the hidden form
      document.getElementById('colorCheckResultsInput').value = JSON.stringify(resultsData);
      
      // Submit the form to trigger the export
      document.getElementById('exportForm').submit();
    });
  }
});

// Function to handle selected inventory items
function handleSelectedInventoryItems(selectedItems) {
  if (selectedItems && selectedItems.length > 0) {
    // Add selected IMEIs to the hidden input for the inventory check form
    document.getElementById('inventory-imeis-input').value = selectedItems.join('\n');
    
    // Show the inventory check footer with Run Check button
    document.getElementById('inventory-check-footer').style.display = 'block';
    
    // Optionally, also add to the main text area for visibility
    const imeiTextArea = document.getElementById('imeis');
    const currentText = imeiTextArea.value.trim();
    const newText = currentText + (currentText ? '\n' : '') + selectedItems.join('\n');
    imeiTextArea.value = newText;
  }
}

// Function to run color check on selected items
function runColorCheck() {
  // Get the selected IMEIs from the hidden input
 const selectedImeis = document.getElementById('inventory-imeis-input').value;
  
  if (selectedImeis.trim() === '') {
    alert('No IMEI numbers selected for checking.');
    return;
  }
  
  // Submit the inventory check form
  document.getElementById('inventory-check-form').submit();
}

// Function to clear the inventory selection
function clearInventoryCheck() {
  document.getElementById('inventory-imeis-input').value = '';
 document.getElementById('inventory-check-footer').style.display = 'none';
}
</script>

<script src="inventory_search_script.js"></script>
</body>
</html>
