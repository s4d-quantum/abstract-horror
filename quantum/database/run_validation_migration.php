<?php
/**
 * run_validation_migration.php
 * Script to run address validation database migration
 * Usage: php run_validation_migration.php
 * Requirements: 2.1, 2.2, 4.4
 */

require_once __DIR__ . '/../orders/imei/includes/ValidationDatabaseHelper.php';

echo "=== Address Validation Database Migration ===\n";
echo "Starting migration process...\n\n";

try {
    // Initialize database helper
    $dbHelper = new ValidationDatabaseHelper();
    
    // Check current state
    echo "1. Checking current database state...\n";
    $missingColumns = $dbHelper->checkValidationColumns();
    
    if (empty($missingColumns)) {
        echo "   ✓ All validation columns already exist\n";
    } else {
        echo "   → Missing columns: " . implode(', ', $missingColumns) . "\n";
    }
    
    // Run migration
    echo "\n2. Running migration...\n";
    $results = $dbHelper->runValidationMigration();
    
    if ($results['success']) {
        echo "   ✓ Migration completed successfully\n";
        foreach ($results['steps_completed'] as $step) {
            echo "   ✓ $step\n";
        }
    } else {
        echo "   ✗ Migration failed\n";
        foreach ($results['errors'] as $error) {
            echo "   ✗ Error: $error\n";
        }
        exit(1);
    }
    
    // Verify migration
    echo "\n3. Verifying migration...\n";
    $verification = $dbHelper->verifyMigration();
    
    if ($verification['success']) {
        echo "   ✓ Migration verification successful\n";
        echo "   ✓ Found " . count($verification['columns_exist']) . " validation columns\n";
        
        // Display column details
        foreach ($verification['columns_exist'] as $column) {
            echo "     - {$column['COLUMN_NAME']} ({$column['DATA_TYPE']}): {$column['COLUMN_COMMENT']}\n";
        }
    } else {
        echo "   ✗ Migration verification failed\n";
        if (!empty($verification['missing_columns'])) {
            echo "   ✗ Still missing columns: " . implode(', ', $verification['missing_columns']) . "\n";
        }
        exit(1);
    }
    
    echo "\n=== Migration Complete ===\n";
    echo "The tbl_bm2 table is now ready for address validation integration.\n";
    
} catch (Exception $e) {
    echo "\n✗ Migration failed with exception: " . $e->getMessage() . "\n";
    exit(1);
}