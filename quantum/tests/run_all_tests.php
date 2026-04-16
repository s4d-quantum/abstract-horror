<?php

/**
 * Test Runner for Address Validation Integration Tests
 * 
 * Runs all test suites for the address validation integration:
 * - AddressValidator unit tests
 * - AddressValidationService integration tests  
 * - Workflow integration end-to-end tests
 */

// Set error reporting for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set time limit for tests
set_time_limit(300); // 5 minutes

echo "Address Validation Integration Test Suite\n";
echo "========================================\n\n";

$start_time = microtime(true);
$total_tests = 0;
$total_passed = 0;
$test_results = [];

// Test 1: AddressValidator Unit Tests
echo "1. Running AddressValidator Unit Tests...\n";
echo "==========================================\n";

try {
    ob_start();
    require_once __DIR__ . '/AddressValidatorTest.php';
    $unit_test = new AddressValidatorTest();
    $unit_test->runAllTests();
    $unit_output = ob_get_clean();
    
    echo $unit_output;
    
    // Parse results (basic parsing)
    if (strpos($unit_output, 'PASSED') !== false) {
        $test_results['AddressValidator Unit Tests'] = 'PASSED';
    } else {
        $test_results['AddressValidator Unit Tests'] = 'FAILED';
    }
    
} catch (Exception $e) {
    echo "Error running AddressValidator unit tests: " . $e->getMessage() . "\n";
    $test_results['AddressValidator Unit Tests'] = 'ERROR: ' . $e->getMessage();
}

echo "\n" . str_repeat("=", 80) . "\n\n";

// Test 2: AddressValidationService Integration Tests
echo "2. Running AddressValidationService Integration Tests...\n";
echo "=======================================================\n";

try {
    ob_start();
    require_once __DIR__ . '/AddressValidationServiceTest.php';
    $integration_test = new AddressValidationServiceTest();
    $integration_test->runAllTests();
    $integration_output = ob_get_clean();
    
    echo $integration_output;
    
    // Parse results
    if (strpos($integration_output, 'PASSED') !== false) {
        $test_results['AddressValidationService Integration Tests'] = 'PASSED';
    } else {
        $test_results['AddressValidationService Integration Tests'] = 'FAILED';
    }
    
} catch (Exception $e) {
    echo "Error running AddressValidationService integration tests: " . $e->getMessage() . "\n";
    $test_results['AddressValidationService Integration Tests'] = 'ERROR: ' . $e->getMessage();
}

echo "\n" . str_repeat("=", 80) . "\n\n";

// Test 3: Workflow Integration End-to-End Tests
echo "3. Running Workflow Integration End-to-End Tests...\n";
echo "===================================================\n";

try {
    ob_start();
    require_once __DIR__ . '/WorkflowIntegrationTest.php';
    $workflow_test = new WorkflowIntegrationTest();
    $workflow_test->runAllTests();
    $workflow_output = ob_get_clean();
    
    echo $workflow_output;
    
    // Parse results
    if (strpos($workflow_output, 'PASSED') !== false) {
        $test_results['Workflow Integration Tests'] = 'PASSED';
    } else {
        $test_results['Workflow Integration Tests'] = 'FAILED';
    }
    
} catch (Exception $e) {
    echo "Error running workflow integration tests: " . $e->getMessage() . "\n";
    $test_results['Workflow Integration Tests'] = 'ERROR: ' . $e->getMessage();
}

echo "\n" . str_repeat("=", 80) . "\n\n";

// Calculate total execution time
$end_time = microtime(true);
$execution_time = round($end_time - $start_time, 2);

// Print overall test summary
echo "OVERALL TEST SUMMARY\n";
echo "===================\n\n";

$passed_count = 0;
$failed_count = 0;
$error_count = 0;

foreach ($test_results as $test_suite => $result) {
    $status_icon = "✗";
    if ($result === 'PASSED') {
        $status_icon = "✓";
        $passed_count++;
    } elseif (strpos($result, 'ERROR:') === 0) {
        $status_icon = "⚠";
        $error_count++;
    } else {
        $failed_count++;
    }
    
    echo "$status_icon $test_suite: $result\n";
}

echo "\nTest Suite Results:\n";
echo "- Passed: $passed_count\n";
echo "- Failed: $failed_count\n";
echo "- Errors: $error_count\n";
echo "- Total: " . count($test_results) . "\n";
echo "\nExecution Time: {$execution_time} seconds\n";

// Determine overall result
$overall_success = ($failed_count === 0 && $error_count === 0);
echo "\nOVERALL RESULT: " . ($overall_success ? "✓ ALL TESTS PASSED" : "✗ SOME TESTS FAILED") . "\n";

// Additional information and recommendations
echo "\n" . str_repeat("=", 80) . "\n";
echo "TEST INFORMATION AND RECOMMENDATIONS\n";
echo str_repeat("=", 80) . "\n\n";

echo "These tests validate the address validation integration implementation:\n\n";

echo "1. AddressValidator Unit Tests:\n";
echo "   - Tests core validation logic and API communication methods\n";
echo "   - Validates address parsing and confidence assessment\n";
echo "   - Tests error handling for various API failure scenarios\n";
echo "   - Uses mock data and reflection to test private methods\n\n";

echo "2. AddressValidationService Integration Tests:\n";
echo "   - Tests complete validation workflow with database operations\n";
echo "   - Validates error handling and response formatting\n";
echo "   - Tests integration with existing database and logging systems\n";
echo "   - Creates test data and validates database operations\n\n";

echo "3. Workflow Integration End-to-End Tests:\n";
echo "   - Tests complete BackMarket to DPD workflow with address validation\n";
echo "   - Validates various address scenarios (valid, invalid, ambiguous)\n";
echo "   - Tests error handling and manual review scenarios\n";
echo "   - Tests data consistency and workflow reliability\n\n";

if (!$overall_success) {
    echo "TROUBLESHOOTING FAILED TESTS:\n";
    echo "-----------------------------\n\n";
    
    if ($error_count > 0) {
        echo "• Database Connection Issues:\n";
        echo "  - Ensure database connection is properly configured in db_config.php\n";
        echo "  - Verify tbl_bm2 table exists and is accessible\n";
        echo "  - Check database permissions for test operations\n\n";
    }
    
    echo "• API Configuration Issues:\n";
    echo "  - Tests expect API calls to fail due to missing/invalid API key\n";
    echo "  - This is normal behavior for testing without real API credentials\n";
    echo "  - Tests validate error handling rather than successful API calls\n\n";
    
    echo "• Environment Setup:\n";
    echo "  - Ensure all required files are present in orders/imei/includes/\n";
    echo "  - Verify AddressValidator.php and validate_address_service.php exist\n";
    echo "  - Check that validation columns can be added to tbl_bm2 table\n\n";
}

echo "NEXT STEPS:\n";
echo "-----------\n\n";

if ($overall_success) {
    echo "✓ All tests passed! The address validation integration is ready for:\n";
    echo "  1. Production deployment with real API credentials\n";
    echo "  2. Integration with the existing BackMarket to DPD workflow\n";
    echo "  3. Monitoring and performance optimization\n\n";
} else {
    echo "• Review failed tests and address any issues\n";
    echo "• Ensure database schema and permissions are correct\n";
    echo "• Verify all implementation files are present and accessible\n";
    echo "• Test with real API credentials in a staging environment\n\n";
}

echo "For production deployment:\n";
echo "1. Configure IDEAL_POSTCODES_API_KEY environment variable\n";
echo "2. Run database migration to add validation columns\n";
echo "3. Update book_dpd_and_update_bm.php to include validation step\n";
echo "4. Set up monitoring for validation success rates and performance\n";

// Exit with appropriate code
exit($overall_success ? 0 : 1);

?>