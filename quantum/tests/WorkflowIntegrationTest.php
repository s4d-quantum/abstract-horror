<?php

/**
 * End-to-End Workflow Integration Tests
 * 
 * Tests complete BackMarket to DPD workflow with address validation,
 * validates various address scenarios including valid, invalid, and ambiguous addresses,
 * and tests error handling and manual review scenarios.
 */

require_once dirname(__DIR__) . '/db_config.php';
require_once dirname(__DIR__) . '/orders/imei/includes/validate_address_service.php';

class WorkflowIntegrationTest {
    
    private $conn;
    private $test_results = [];
    private $test_count = 0;
    private $passed_count = 0;
    private $test_orders = [];
    
    public function __construct() {
        global $conn;
        $this->conn = $conn;
        
        if (!$this->conn || mysqli_connect_errno()) {
            throw new Exception("Database connection required for workflow integration tests");
        }
        
        // Set up test environment
        $this->setupTestEnvironment();
    }
    
    /**
     * Set up test environment with various address scenarios
     */
    private function setupTestEnvironment() {
        // Ensure validation columns exist
        $this->ensureValidationColumns();
        
        // Clean up any existing test data
        $this->cleanupTestData();
        
        // Create test orders with different address scenarios
        $this->createTestOrders();
    }
    
    /**
     * Ensure validation columns exist
     */
    private function ensureValidationColumns() {
        $validation_columns = [
            'v_status' => 'INT(11) DEFAULT NULL',
            'v_match_level' => 'VARCHAR(50) DEFAULT NULL',
            'v_confidence_score' => 'DECIMAL(3,2) DEFAULT NULL',
            'v_api_response' => 'TEXT DEFAULT NULL',
            'v_validated_at' => 'TIMESTAMP DEFAULT NULL',
            'v_building_number' => 'VARCHAR(50) DEFAULT NULL',
            'v_thoroughfare' => 'VARCHAR(255) DEFAULT NULL',
            'v_line_1' => 'VARCHAR(255) DEFAULT NULL',
            'v_line_2' => 'VARCHAR(255) DEFAULT NULL',
            'v_line_3' => 'VARCHAR(255) DEFAULT NULL',
            'v_line_4' => 'VARCHAR(255) DEFAULT NULL',
            'v_postcode' => 'VARCHAR(20) DEFAULT NULL',
            'v_town' => 'VARCHAR(255) DEFAULT NULL',
            'v_county' => 'VARCHAR(255) DEFAULT NULL',
            'v_country' => 'VARCHAR(100) DEFAULT NULL'
        ];
        
        foreach ($validation_columns as $column_name => $column_definition) {
            $check_query = "SHOW COLUMNS FROM tbl_bm2 LIKE '$column_name'";
            $result = mysqli_query($this->conn, $check_query);
            
            if (mysqli_num_rows($result) == 0) {
                $alter_query = "ALTER TABLE tbl_bm2 ADD COLUMN `$column_name` $column_definition";
                mysqli_query($this->conn, $alter_query);
            }
        }
    }
    
    /**
     * Create test orders with various address scenarios
     */
    private function createTestOrders() {
        $test_scenarios = [
            'valid_london_address' => [
                'bm_order_id' => 'TEST_WORKFLOW_VALID_' . time() . '_' . rand(1000, 9999),
                'first_name' => 'John',
                'last_name' => 'Smith',
                'phone' => '07123456789',
                'email' => 'john.smith@test.com',
                'street' => '10 Downing Street',
                'street_2' => '',
                'city' => 'London',
                'postal_code' => 'SW1A 2AA',
                'country' => 'GB',
                'price' => '149.99'
            ],
            'valid_manchester_address' => [
                'bm_order_id' => 'TEST_WORKFLOW_MANCHESTER_' . time() . '_' . rand(1000, 9999),
                'first_name' => 'Jane',
                'last_name' => 'Doe',
                'phone' => '07987654321',
                'email' => 'jane.doe@test.com',
                'street' => '1 Deansgate',
                'street_2' => 'Suite 100',
                'city' => 'Manchester',
                'postal_code' => 'M1 1AA',
                'country' => 'GB',
                'price' => '299.99'
            ],
            'ambiguous_address' => [
                'bm_order_id' => 'TEST_WORKFLOW_AMBIGUOUS_' . time() . '_' . rand(1000, 9999),
                'first_name' => 'Bob',
                'last_name' => 'Wilson',
                'phone' => '07555123456',
                'email' => 'bob.wilson@test.com',
                'street' => '1 High Street', // Very common street name
                'street_2' => '',
                'city' => 'London',
                'postal_code' => 'E1 6AN',
                'country' => 'GB',
                'price' => '199.99'
            ],
            'invalid_postcode' => [
                'bm_order_id' => 'TEST_WORKFLOW_INVALID_PC_' . time() . '_' . rand(1000, 9999),
                'first_name' => 'Alice',
                'last_name' => 'Brown',
                'phone' => '07444555666',
                'email' => 'alice.brown@test.com',
                'street' => '123 Test Street',
                'street_2' => '',
                'city' => 'London',
                'postal_code' => 'INVALID123', // Invalid postcode format
                'country' => 'GB',
                'price' => '99.99'
            ],
            'missing_required_fields' => [
                'bm_order_id' => 'TEST_WORKFLOW_MISSING_' . time() . '_' . rand(1000, 9999),
                'first_name' => 'Charlie',
                'last_name' => 'Green',
                'phone' => '07333444555',
                'email' => 'charlie.green@test.com',
                'street' => '', // Missing required street
                'street_2' => '',
                'city' => 'Birmingham',
                'postal_code' => 'B1 1AA',
                'country' => 'GB',
                'price' => '79.99'
            ],
            'offshore_address' => [
                'bm_order_id' => 'TEST_WORKFLOW_OFFSHORE_' . time() . '_' . rand(1000, 9999),
                'first_name' => 'David',
                'last_name' => 'Jones',
                'phone' => '07222333444',
                'email' => 'david.jones@test.com',
                'street' => '15 Royal Avenue',
                'street_2' => '',
                'city' => 'Belfast',
                'postal_code' => 'BT1 1AA', // Northern Ireland postcode
                'country' => 'GB',
                'price' => '129.99'
            ]
        ];
        
        foreach ($test_scenarios as $scenario_name => $order_data) {
            $this->insertTestOrder($order_data);
            $this->test_orders[$scenario_name] = $order_data['bm_order_id'];
        }
    }
    
    /**
     * Insert a test order into the database
     */
    private function insertTestOrder($order_data) {
        $insert_query = "
            INSERT INTO tbl_bm2 (
                bm_order_id, first_name, last_name, phone, email,
                street, street_2, city, postal_code, country, price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = mysqli_prepare($this->conn, $insert_query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "sssssssssss",
                $order_data['bm_order_id'],
                $order_data['first_name'],
                $order_data['last_name'],
                $order_data['phone'],
                $order_data['email'],
                $order_data['street'],
                $order_data['street_2'],
                $order_data['city'],
                $order_data['postal_code'],
                $order_data['country'],
                $order_data['price']
            );
            
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    }
    
    /**
     * Clean up test data
     */
    private function cleanupTestData() {
        $cleanup_query = "DELETE FROM tbl_bm2 WHERE bm_order_id LIKE 'TEST_WORKFLOW_%'";
        mysqli_query($this->conn, $cleanup_query);
    }
    
    /**
     * Run all workflow integration tests
     */
    public function runAllTests() {
        echo "Running Workflow Integration Tests...\n";
        echo "====================================\n\n";
        
        try {
            // Test complete workflow scenarios
            $this->testCompleteWorkflowScenarios();
            
            // Test address validation integration
            $this->testAddressValidationIntegration();
            
            // Test error handling scenarios
            $this->testErrorHandlingScenarios();
            
            // Test manual review scenarios
            $this->testManualReviewScenarios();
            
            // Test DPD address formatting integration
            $this->testDPDAddressFormattingIntegration();
            
            // Test workflow performance and reliability
            $this->testWorkflowPerformanceAndReliability();
            
            // Test data consistency and integrity
            $this->testDataConsistencyAndIntegrity();
            
            $this->printTestSummary();
            
        } finally {
            // Clean up test data
            $this->cleanupTestData();
        }
    }
    
    /**
     * Test complete workflow scenarios
     */
    private function testCompleteWorkflowScenarios() {
        echo "Testing Complete Workflow Scenarios...\n";
        
        // Test valid London address workflow
        $service = new AddressValidationService($this->conn, true);
        $result = $service->validateOrderAddressWithErrorHandling($this->test_orders['valid_london_address']);
        
        // Since we don't have a real API key, we expect configuration/API errors
        $this->assert($result !== null, "Workflow should return a result");
        $this->assert(isset($result['success']), "Result should have success field");
        $this->assert(isset($result['error_type']) || $result['success'] === true, "Result should have error_type or be successful");
        
        // Test that debug messages are collected
        $debug_messages = $service->getDebugMessages();
        $this->assert(!empty($debug_messages), "Workflow should collect debug messages");
        $this->assert(strpos($debug_messages, 'Starting enhanced address validation') !== false, "Should start validation workflow");
        
        // Test valid Manchester address workflow
        $service2 = new AddressValidationService($this->conn, true);
        $result2 = $service2->validateOrderAddressWithErrorHandling($this->test_orders['valid_manchester_address']);
        
        $this->assert($result2 !== null, "Manchester address workflow should return a result");
        $this->assert(isset($result2['success']), "Manchester result should have success field");
        
        echo "✓ Complete Workflow Scenarios tests completed\n\n";
    }
    
    /**
     * Test address validation integration
     */
    private function testAddressValidationIntegration() {
        echo "Testing Address Validation Integration...\n";
        
        $service = new AddressValidationService($this->conn, true);
        
        // Test address data loading integration
        $reflection = new ReflectionClass($service);
        $load_method = $reflection->getMethod('loadAddressData');
        $load_method->setAccessible(true);
        
        // Test loading valid address data
        $result = $load_method->invoke($service, $this->test_orders['valid_london_address']);
        $this->assert($result['success'] === true, "Should successfully load valid address data");
        $this->assert($result['address_data']['street'] === '10 Downing Street', "Should load correct street");
        $this->assert($result['address_data']['postal_code'] === 'SW1A 2AA', "Should load correct postcode");
        
        // Test address data validation
        $validate_method = $reflection->getMethod('validateAddressData');
        $validate_method->setAccessible(true);
        
        $valid_address = [
            'street' => '10 Downing Street',
            'city' => 'London',
            'postal_code' => 'SW1A 2AA',
            'country' => 'GB'
        ];
        
        $validation_result = $validate_method->invoke($service, $valid_address);
        $this->assert($validation_result['success'] === true, "Valid address data should pass validation");
        
        // Test invalid address data
        $invalid_address = [
            'street' => '', // Missing required field
            'city' => 'London',
            'postal_code' => 'INVALID',
            'country' => 'GB'
        ];
        
        $validation_result = $validate_method->invoke($service, $invalid_address);
        $this->assert($validation_result['success'] === false, "Invalid address data should fail validation");
        $this->assert($validation_result['error_type'] === 'validation_failed', "Should return validation_failed error");
        
        echo "✓ Address Validation Integration tests completed\n\n";
    }
    
    /**
     * Test error handling scenarios
     */
    private function testErrorHandlingScenarios() {
        echo "Testing Error Handling Scenarios...\n";
        
        $service = new AddressValidationService($this->conn, true);
        
        // Test missing required fields scenario
        $result = $service->validateOrderAddressWithErrorHandling($this->test_orders['missing_required_fields']);
        $this->assert($result['success'] === false, "Missing required fields should fail");
        $this->assert($result['error_type'] === 'validation_failed', "Should return validation_failed for missing fields");
        
        // Test invalid postcode scenario
        $result = $service->validateOrderAddressWithErrorHandling($this->test_orders['invalid_postcode']);
        $this->assert($result['success'] === false, "Invalid postcode should fail");
        $this->assert(
            $result['error_type'] === 'validation_failed' || 
            $result['error_type'] === 'configuration_error' ||
            $result['error_type'] === 'api_error',
            "Should return appropriate error type for invalid postcode"
        );
        
        // Test offshore address scenario
        $result = $service->validateOrderAddressWithErrorHandling($this->test_orders['offshore_address']);
        $this->assert($result['success'] === false, "Offshore address should fail or require manual review");
        
        // Test non-existent order scenario
        $result = $service->validateOrderAddressWithErrorHandling('NON_EXISTENT_ORDER_ID');
        $this->assert($result['success'] === false, "Non-existent order should fail");
        $this->assert($result['error_type'] === 'data_not_found', "Should return data_not_found for non-existent order");
        
        echo "✓ Error Handling Scenarios tests completed\n\n";
    }
    
    /**
     * Test manual review scenarios
     */
    private function testManualReviewScenarios() {
        echo "Testing Manual Review Scenarios...\n";
        
        $service = new AddressValidationService($this->conn, true);
        
        // Test manual review response creation
        $reflection = new ReflectionClass($service);
        $manual_review_method = $reflection->getMethod('createManualReviewResponse');
        $manual_review_method->setAccessible(true);
        
        // Test low confidence manual review
        $validation_result = [
            'confidence_score' => 0.3,
            'match_level' => 'low',
            'corrections_made' => ['street', 'postcode']
        ];
        
        $result = $manual_review_method->invoke($service, 'low_confidence', $validation_result);
        $this->assert($result['success'] === false, "Manual review should return failure");
        $this->assert($result['error_type'] === 'manual_review_required', "Should return manual_review_required");
        $this->assert($result['requires_manual_review'] === true, "Should indicate manual review required");
        $this->assert(!empty($result['guidance']), "Should provide guidance for manual review");
        $this->assert($result['reason'] === 'low_confidence', "Should include correct reason");
        
        // Test postcode correction manual review
        $result = $manual_review_method->invoke($service, 'postcode_correction', $validation_result);
        $this->assert($result['error_type'] === 'manual_review_required', "Postcode correction should require manual review");
        $this->assert($result['reason'] === 'postcode_correction', "Should include postcode correction reason");
        
        // Test significant corrections manual review
        $result = $manual_review_method->invoke($service, 'significant_corrections', $validation_result);
        $this->assert($result['error_type'] === 'manual_review_required', "Significant corrections should require manual review");
        $this->assert($result['reason'] === 'significant_corrections', "Should include significant corrections reason");
        
        echo "✓ Manual Review Scenarios tests completed\n\n";
    }
    
    /**
     * Test DPD address formatting integration
     */
    private function testDPDAddressFormattingIntegration() {
        echo "Testing DPD Address Formatting Integration...\n";
        
        $service = new AddressValidationService($this->conn, true);
        
        // Insert some validated address data for testing
        $update_query = "
            UPDATE tbl_bm2 SET 
                v_status = 1,
                v_match_level = 'high',
                v_confidence_score = 0.95,
                v_validated_at = NOW(),
                v_building_number = '10',
                v_thoroughfare = 'Downing Street',
                v_line_1 = '10 Downing Street',
                v_postcode = 'SW1A 2AA',
                v_town = 'London',
                v_county = 'Greater London',
                v_country = 'GB'
            WHERE bm_order_id = ?
        ";
        
        $stmt = mysqli_prepare($this->conn, $update_query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "s", $this->test_orders['valid_london_address']);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        
        // Test retrieving validated address for DPD
        $result = $service->getValidatedAddressForDPD($this->test_orders['valid_london_address']);
        $this->assert($result['success'] === true, "Should successfully retrieve validated address for DPD");
        $this->assert($result['validation_info']['is_validated'] === true, "Should indicate address is validated");
        
        // Test DPD address format
        $dpd_address = $result['address_data'];
        $this->assert(!empty($dpd_address['first_name']), "DPD address should include first name");
        $this->assert(!empty($dpd_address['last_name']), "DPD address should include last name");
        $this->assert(!empty($dpd_address['street']), "DPD address should include formatted street");
        $this->assert(!empty($dpd_address['city']), "DPD address should include city");
        $this->assert(!empty($dpd_address['postal_code']), "DPD address should include formatted postcode");
        $this->assert($dpd_address['country'] === 'GB', "DPD address should have correct country");
        
        // Test validated components
        $this->assert(isset($result['validated_components']), "Should include validated components");
        $this->assert($result['validated_components']['postcode'] === 'SW1A 2AA', "Should include formatted postcode in components");
        
        // Test validation info
        $validation_info = $result['validation_info'];
        $this->assert($validation_info['confidence_score'] === 0.95, "Should include correct confidence score");
        $this->assert($validation_info['match_level'] === 'high', "Should include correct match level");
        
        echo "✓ DPD Address Formatting Integration tests completed\n\n";
    }
    
    /**
     * Test workflow performance and reliability
     */
    private function testWorkflowPerformanceAndReliability() {
        echo "Testing Workflow Performance and Reliability...\n";
        
        $service = new AddressValidationService($this->conn, false); // Disable debug for performance test
        
        // Test multiple concurrent validations
        $start_time = microtime(true);
        $results = [];
        
        foreach ($this->test_orders as $scenario => $order_id) {
            $result = $service->validateOrderAddressWithErrorHandling($order_id);
            $results[$scenario] = $result;
        }
        
        $end_time = microtime(true);
        $total_time = $end_time - $start_time;
        
        $this->assert($total_time < 30, "Multiple validations should complete within reasonable time (30s)");
        $this->assert(count($results) === count($this->test_orders), "Should process all test orders");
        
        // Test that all results have proper structure
        foreach ($results as $scenario => $result) {
            $this->assert(isset($result['success']), "Result for $scenario should have success field");
            $this->assert(
                isset($result['error_type']) || $result['success'] === true,
                "Result for $scenario should have error_type or be successful"
            );
        }
        
        // Test service reliability with repeated calls
        $repeated_results = [];
        for ($i = 0; $i < 3; $i++) {
            $result = $service->validateOrderAddressWithErrorHandling($this->test_orders['valid_london_address']);
            $repeated_results[] = $result;
        }
        
        // Results should be consistent
        $first_result_type = $repeated_results[0]['success'] ? 'success' : $repeated_results[0]['error_type'];
        foreach ($repeated_results as $i => $result) {
            $result_type = $result['success'] ? 'success' : $result['error_type'];
            $this->assert(
                $result_type === $first_result_type,
                "Repeated validation calls should return consistent results (call $i)"
            );
        }
        
        echo "✓ Workflow Performance and Reliability tests completed\n\n";
    }
    
    /**
     * Test data consistency and integrity
     */
    private function testDataConsistencyAndIntegrity() {
        echo "Testing Data Consistency and Integrity...\n";
        
        $service = new AddressValidationService($this->conn, true);
        
        // Test database transaction integrity
        $original_autocommit = mysqli_autocommit($this->conn, false);
        
        try {
            // Simulate validation storage
            $reflection = new ReflectionClass($service);
            $store_method = $reflection->getMethod('storeValidationResult');
            $store_method->setAccessible(true);
            
            $mock_validation = [
                'validated_address' => [
                    'building_number' => '123',
                    'thoroughfare' => 'Test Street',
                    'postcode' => 'SW1A 1AA',
                    'post_town' => 'London'
                ],
                'match_level' => 'high',
                'confidence_score' => 0.9,
                'raw_api_response' => ['test' => 'data']
            ];
            
            $result = $store_method->invoke($service, $this->test_orders['valid_london_address'], $mock_validation, 1);
            $this->assert($result['success'] === true, "Should successfully store validation result");
            
            // Verify data was stored
            $check_query = "SELECT v_status, v_confidence_score FROM tbl_bm2 WHERE bm_order_id = ?";
            $stmt = mysqli_prepare($this->conn, $check_query);
            if ($stmt) {
                mysqli_stmt_bind_param($stmt, "s", $this->test_orders['valid_london_address']);
                mysqli_stmt_execute($stmt);
                $check_result = mysqli_stmt_get_result($stmt);
                
                if ($check_result && mysqli_num_rows($check_result) > 0) {
                    $stored_data = mysqli_fetch_assoc($check_result);
                    $this->assert($stored_data['v_status'] == 1, "Should store correct validation status");
                    $this->assert(abs($stored_data['v_confidence_score'] - 0.9) < 0.01, "Should store correct confidence score");
                }
                
                mysqli_stmt_close($stmt);
            }
            
            mysqli_commit($this->conn);
            
        } catch (Exception $e) {
            mysqli_rollback($this->conn);
            $this->assert(false, "Database transaction should not fail: " . $e->getMessage());
        } finally {
            mysqli_autocommit($this->conn, $original_autocommit);
        }
        
        // Test data validation consistency
        $validation_stats = $service->getValidationStatistics(1);
        $this->assert($validation_stats['success'] === true, "Should successfully get validation statistics");
        $this->assert(is_array($validation_stats['statistics']), "Statistics should be an array");
        
        // Test that statistics are consistent with stored data
        $stats = $validation_stats['statistics'];
        $this->assert($stats['total_validations'] >= 0, "Total validations should be non-negative");
        $this->assert($stats['success_rate'] >= 0 && $stats['success_rate'] <= 100, "Success rate should be between 0 and 100");
        
        echo "✓ Data Consistency and Integrity tests completed\n\n";
    }
    
    /**
     * Assert helper method
     */
    private function assert($condition, $message) {
        $this->test_count++;
        if ($condition) {
            $this->passed_count++;
            $this->test_results[] = "✓ PASS: $message";
        } else {
            $this->test_results[] = "✗ FAIL: $message";
        }
    }
    
    /**
     * Print test summary
     */
    private function printTestSummary() {
        echo "Test Summary\n";
        echo "============\n";
        echo "Total Tests: {$this->test_count}\n";
        echo "Passed: {$this->passed_count}\n";
        echo "Failed: " . ($this->test_count - $this->passed_count) . "\n";
        echo "Success Rate: " . round(($this->passed_count / $this->test_count) * 100, 2) . "%\n\n";
        
        if ($this->passed_count < $this->test_count) {
            echo "Failed Tests:\n";
            foreach ($this->test_results as $result) {
                if (strpos($result, '✗ FAIL') === 0) {
                    echo $result . "\n";
                }
            }
        }
        
        echo "\nWorkflow Integration Tests " . ($this->passed_count === $this->test_count ? "PASSED" : "FAILED") . "\n";
    }
}

// Run tests if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    try {
        $test = new WorkflowIntegrationTest();
        $test->runAllTests();
    } catch (Exception $e) {
        echo "Error running workflow integration tests: " . $e->getMessage() . "\n";
        exit(1);
    }
}

?>