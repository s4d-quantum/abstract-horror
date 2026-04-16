<?php
// Cron job to release stale reservations
// Should be run hourly

require_once '../db_config.php';

echo "Starting stale reservation release process...\n";

// Include the reservation manager
require_once '../sales/imei_orders/includes/reservation_manager.php';

$manager = new ReservationManager($conn);

// Release stale reservations
$released_count = $manager->releaseStaleReservations();

echo "Released $released_count stale reservations.\n";

// Get current stats
$stats = $manager->getReservationStats();
echo "Current stats:\n";
echo "Active reservations: " . $stats['active_reservations'] . "\n";
echo "Stale reservations: " . $stats['stale_reservations'] . "\n";
echo "Reservation timeout: " . $stats['reservation_timeout_hours'] . " hours\n";

echo "Process completed.\n";
?>