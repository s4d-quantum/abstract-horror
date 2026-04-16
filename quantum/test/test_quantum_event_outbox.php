<?php

if (PHP_SAPI !== 'cli') {
    echo "This script is CLI-only.\n";
    exit(1);
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../shared/quantum_event_outbox.php';

$rootPath = dirname(__DIR__, 2);
$dotenv = Dotenv\Dotenv::createImmutable($rootPath);
$dotenv->safeLoad();

$host = isset($_ENV['QUANTUM_DB_HOST']) ? $_ENV['QUANTUM_DB_HOST'] : null;
$port = isset($_ENV['QUANTUM_DB_PORT']) ? (int)$_ENV['QUANTUM_DB_PORT'] : 3306;
$username = isset($_ENV['QUANTUM_DB_USER']) ? $_ENV['QUANTUM_DB_USER'] : null;
$password = isset($_ENV['QUANTUM_DB_PASSWORD']) ? $_ENV['QUANTUM_DB_PASSWORD'] : null;
$database = isset($_ENV['QUANTUM_DB_NAME']) ? $_ENV['QUANTUM_DB_NAME'] : null;

if (!$host || !$username || !$database) {
    fwrite(STDERR, "Missing Quantum DB settings in root .env.\n");
    exit(1);
}

$conn = mysqli_init();
if (!$conn) {
    fwrite(STDERR, "Unable to initialize mysqli.\n");
    exit(1);
}

if (!mysqli_real_connect($conn, $host, $username, $password, $database, $port)) {
    fwrite(STDERR, "Database connection failed: " . mysqli_connect_error() . "\n");
    exit(1);
}

mysqli_set_charset($conn, 'utf8mb4');

$payload = array(
    'source' => 'quantum',
    'operation' => 'manual_test',
    'message' => 'Manual event outbox test',
);

$result = recordQuantumEvent(
    $conn,
    'test.quantum_event_outbox',
    'system',
    'manual-test',
    $payload,
    __FILE__,
    'cli',
    array('manual-test')
);

if ($result === false) {
    fwrite(STDERR, "Failed to write test event.\n");
    mysqli_close($conn);
    exit(1);
}

if ($result === 0) {
    echo "Test event already existed; duplicate write ignored.\n";
    mysqli_close($conn);
    exit(0);
}

echo "Inserted test event with ID " . $result . ".\n";

mysqli_close($conn);
