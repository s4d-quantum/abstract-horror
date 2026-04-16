<?php

/**
 * Integration Tests for AddressValidationService Class
 * 
 * Tests complete validation workflow with database operations,
 * validates error handling and response formatting,
 * and tests integration with existing database and logging systems.
 */

require_once dirname(__DIR__) . '/db_config.php';
require_once dirname(__DIR__) . '/orders/imei/includes/validate_address_service.php';

class AddressValidationServiceTest {
    
    private $conn;
    private $service;
    private $test_results = [];
    private $test_count = 0;
    private $passed_count = 0;
    private $test_bm_order_id;
    
    public function __construct() {
        global $conn;
        $this->conn = $conn;
        
        // Generate unique test order ID
        $this->test_bm_order_id = 'TEST_BM_ORDER_' . time() . '_' . rand(1000, 9999);
        
        // Ensure we're using the test database or have test data
        if (!$this->conn || mysqli_connect_errno()) {
            throw new Exception("Database connection required for integration tests");
        }
        
        // Initialize service with debug mode
        $this->service = new AddressValidationService($this->conn, true);
        
        // Set up test environment
        $this->setupTestEnvironment();
    }
    
    /**
     * Set up test environment with test data
     */
    private function setupTestEnvironment() {
        // Ensure validation columns exist
        $this->ensureValidationColumns();
        
        // Insert test data
        $this->insertTestData();
    }
    
    /**
     * Ensure validation columns exist for testing
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
     * Insert test data for testing
     */
    private function insertTestData() {
        // Clean up any existing test data
        $cleanup_query = "DELETE FROM tbl_bm2 WHERE bm_order_id LIKE 'TEST_BM_ORDER_%'";
        mysqli_query($this->conn, $cleanup_query);
        
        // Insert test order data
        $insert_query = "
            INSERT INTO tbl_bm2 (
                bm_order_id, first_name, last_name, phone, email,
                street, street_2, city, postal_code, country, price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = mysqli_prepare($this->conn, $insert_query);
        if ($stmt) {
            $first_name = 'John';
            $last_name = 'Doe';
            $phone = '07123456789';
            $email = 'john.doe@test.com';
            $street = '123 Test Street';
            $street_2 = 'Apartment 4B';
            $city = 'London';
            $postal_code = 'SW1A 1AA';
            $country = 'GB';
            $price = '99.99';
            
            mysqli_stmt_bind_param($stmt, "sssssssssss",
                $this->test_bm_order_id, $first_name, $last_name, $phone, $email,
                $street, $street_2, $city, $postal_code, $country, $price
            );
            
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
    }
    
    /**
     * Clean up test data
     */
    private function cleanupTestData() {
        $cleanup_query = "DELETE FROM tbl_bm2 WHERE bm_order_id LIKE 'TEST_BM_ORDER_%'";
        mysqli_query($this->conn, $cleanup_query);
    }
    
    /**
     * Run all integration tests
     */
    public function runAllTests() {
        echo "Running AddressValidationService Integration Tests...\n";
        echo "===================================================\n\n";
        
        try {
            // Test database operations
            $this->testDatabaseOperations();
            
            // Test address data loading
            $this->testAddressDataLoading();
            
            // Test existing validation checking
            $this->testExistingValidationChecking();
            
            // Test validation result storage
            $this->testValidationResultStorage();
            
            // Test validated address retrieval for DPD
            $this->testValidatedAddressRetrieval();
            
            // Test error handling and response formatting
            $this->testErrorHandlingAndResponseFormatting();
            
            // Test validation statistics
            $this->testValidationStatistics();
            
            // Test service integration with mock scenarios
            $this->testServiceIntegrationScenarios();
            
            $this->printTestSummary();
            
        } finally {
            // Clean up test data
            $this->cleanupTestData();
        }
    }
    
    /**
     * Test database operations
     */
    private function testDatabaseOperations() {
        echo "Testing Database Operations...\n";
        
        // Test database connection
        $this->assert($this->conn !== null, "Database connection should be available");
        $this->assert(!mysqli_connect_errno(), "Database connection should not have errors");
        
        // Test table existence
        $table_check = mysqli_query($this->conn, "SHOW TABLES LIKE 'tbl_bm2'");
        $this->assert(mysqli_num_rows($table_check) > 0, "tbl_bm2 table should exist");
        
        // Test validation columns existence
        $validation_columns = ['v_status', 'v_match_level', 'v_confidence_score'];
        foreach ($validation_columns as $column) {
            $column_check = mysqli_query($this->conn, "SHOW COLUMNS FROM tbl_bm2 LIKE '$column'");
            $this->assert(mysqli_num_rows($column_check) > 0, "Validation column $column should exist");
        }
        
        echo "✓ Database Operations tests completed\n\n";
    }
    
    /**
     * Test address data loading from database
     */
    private function testAddressDataLoading() {
        echo "Testing Address Data Loading...\n";
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->service);
        $method = $reflection->getMethod('loadAddressData');
        $method->setAccessible(true);
        
        // Test loading existing order
        $result = $method->invoke($this->service, $this->test_bm_order_id);
        $this->assert($result['success'] === true, "Should successfully load existing order data");
        $this->assert(!empty($result['address_data']), "Should return address data");
        $this->assert($result['address_data']['street'] === '123 Test Street', "Should load correct street address");
        $this->assert($result['address_data']['city'] === 'London', "Should load correct city");
        
        // Test loading non-existent order
        $result = $method->invoke($this->service, 'NON_EXISTENT_ORDER');
        $this->assert($result['success'] === false, "Should fail for non-existent order");
        $this->assert($result['error_type'] === 'data_not_found', "Should return data_not_found error");
        
        echo "✓ Address Data Loading tests completed\n\n";
    }
    
    /**
     * Test existing validation checking
     */
    private function testExistingValidationChecking() {
        echo "Testing Existing Validation Checking...\n";
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->service);
        $method = $reflection->getMethod('getExistingValidation');
        $method->setAccessible(true);
        
        // Test with no existing validation
        $result = $method->invoke($this->service, $this->test_bm_order_id);
        $this->assert($result['success'] === true, "Should successfully check for existing validation");
        $this->assert($result['has_validation'] === false, "Should indicate no existing validation");
        
        // Insert validation data and test again
        $update_query = "
            UPDATE tbl_bm2 SET 
                v_status = 1, 
                v_match_level = 'high', 
                v_confidence_score = 0.95,
                v_validated_at = NOW(),
                v_postcode = 'SW1A 1AA',
                v_town = 'London'
            WHERE bm_order_id = ?
        ";
        
        $stmt = mysqli_prepare($this->conn, $update_query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "s", $this->test_bm_order_id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        
        // Test with existing validation
        $result = $method->invoke($this->service, $this->test_bm_order_id);
        $this->assert($result['success'] === true, "Should successfully find existing validation");
        $this->assert($result['has_validation'] === true, "Should indicate existing validation found");
        $this->assert($result['validation_data']['confidence_score'] === 0.95, "Should return correct confidence score");
        
        echo "✓ Existing Validation Checking tests completed\n\n";
    }
    
    /**
     * Test validation result storage
     */
    private function testValidationResultStorage() {
        echo "Testing Validation Result Storage...\n";
        
        // Use reflection to access private method
        $reflection = new ReflectionClass($this->service);
        $method = $reflection->getMethod('storeValidationResult');
        $method->setAccessible(true);
        
        // Create mock validation result
        $validation_result = [
            'success' => true,
            'validated_address' => [
                'building_number' => '123',
                'thoroughfare' => 'Test Street',
                'line_1' => '123 Test Street',
                'postcode' => 'SW1A 1AA',
                'post_town' => 'London',
                'county' => 'Greater London',
                'country' => 'GB'
            ],
            'match_level' => 'high',
            'confidence_score' => 0.92,
            'corrections_made' => [],
            'raw_api_response' => ['test' => 'response']
        ];
        
        // Test storing validation result
        $result = $method->invoke($this->service, $this->test_bm_order_id, $validation_result, 1);
        $this->assert($result['success'] === true, "Should successfully store validation result");
        
        // Verify data was stored correctly
        $check_query = "
            SELECT v_status, v_match_level, v_confidence_score, v_postcode, v_town 
            FROM tbl_bm2 
            WHERE bm_order_id = ?
        ";
        
        $stmt = mysqli_prepare($this->conn, $check_query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "s", $this->test_bm_order_id);
            mysqli_stmt_execute($stmt);
            $check_result = mysqli_stmt_get_result($stmt);
            
            if ($check_result && mysqli_num_rows($check_result) > 0) {
                $stored_data = mysqli_fetch_assoc($check_result);
                $this->assert($stored_data['v_status'] == 1, "Should store correct validation status");
                $this->assert($stored_data['v_match_level'] === 'high', "Should store correct match level");
                $this->assert(abs($stored_data['v_confidence_score'] - 0.92) < 0.01, "Should store correct confidence score");
                $this->assert($stored_data['v_postcode'] === 'SW1A 1AA', "Should store correct postcode");
            }
            
            mysqli_stmt_close($stmt);
        }
        
        echo "✓ Validation Result Storage tests completed\n\n";
    }
    
    /**
     * Test validated address retrieval for DPD
     */
    private function testValidatedAddressRetrieval() {
        echo "Testing Validated Address Retrieval for DPD...\n";
        
        // Test retrieving validated address data
        $result = $this->service->getValidatedAddressForDPD($this->test_bm_order_id);
        $this->assert($result['success'] === true, "Should successfully retrieve validated address");
        $this->assert(!empty($result['address_data']), "Should return address data");
        $this->assert($result['validation_info']['is_validated'] === true, "Should indicate address is validated");
        
        // Test DPD address format
        $address_data = $result['address_data'];
        $this->assert(!empty($address_data['first_name']), "Should include first name");
        $this->assert(!empty($address_data['last_name']), "Should include last name");
        $this->assert(!empty($address_data['street']), "Should include street address");
        $this->assert(!empty($address_data['city']), "Should include city");
        $this->assert(!empty($address_data['postal_code']), "Should include postal code");
        
        // Test with non-existent order
        $result = $this->service->getValidatedAddressForDPD('NON_EXISTENT_ORDER');
        $this->assert($result['success'] === false, "Should fail for non-existent order");
        $this->assert($result['error_type'] === 'data_not_found', "Should return data_not_found error");
        
        echo "✓ Validated Address Retrieval tests completed\n\n";
    }
    
    /**
     * Test error handling and response formatting
     */
    private function testErrorHandlingAndResponseFormatting() {
        echo "Testing Error Handling and Response Formatting...\n";
        
        // Use reflection to access private methods
        $reflection = new ReflectionClass($this->service);
        
        // Test API failure handling
        $api_failure_method = $reflection->getMethod('handleApiFailure');
        $api_failure_method->setAccessible(true);
        
        $api_error = [
            'error_type' => 'api_error',
            'message' => 'API rate limit exceeded',
            'details' => 'Too many requests'
        ];
        
        $result = $api_failure_method->invoke($this->service, $api_error);
        $this->assert($result['success'] === false, "API failure should return failure");
        $this->assert($result['error_type'] === 'rate_limit_exceeded', "Should detect rate limit error");
        $this->assert(isset($result['retry_after']), "Should include retry_after for rate limit");
        
        // Test database error handling
        $db_error_method = $reflection->getMethod('handleDatabaseError');
        $db_error_method->setAccessible(true);
        
        $result = $db_error_method->invoke($this->service, 'test operation', 'Connection failed');
        $this->assert($result['success'] === false, "Database error should return failure");
        $this->assert($result['error_type'] === 'database_connection_error', "Should detect connection error");
        
        // Test manual review response creation
        $manual_review_method = $reflection->getMethod('createManualReviewResponse');
        $manual_review_method->setAccessible(true);
        
        $validation_result = [
            'confidence_score' => 0.3,
            'match_level' => 'low',
            'corrections_made' => ['postcode', 'street']
        ];
        
        $result = $manual_review_method->invoke($this->service, 'low_confidence', $validation_result);
        $this->assert($result['success'] === false, "Manual review should return failure");
        $this->assert($result['error_type'] === 'manual_review_required', "Should return manual_review_required");
        $this->assert($result['requires_manual_review'] === true, "Should indicate manual review required");
        $this->assert(!empty($result['guidance']), "Should provide guidance");
        
        echo "✓ Error Handling and Response Formatting tests completed\n\n";
    }
    
    /**
     * Test validation statistics
     */
    private function testValidationStatistics() {
        echo "Testing Validation Statistics...\n";
        
        // Test getting validation statistics
        $result = $this->service->getValidationStatistics(30);
        $this->assert($result['success'] === true, "Should successfully get validation statistics");
        $this->assert(isset($result['statistics']), "Should return statistics data");
        $this->assert(isset($result['statistics']['total_validations']), "Should include total validations");
        $this->assert(isset($result['statistics']['success_rate']), "Should include success rate");
        $this->assert(isset($result['statistics']['match_level_distribution']), "Should include match level distribution");
        
        // Verify statistics structure
        $stats = $result['statistics'];
        $this->assert($stats['period_days'] === 30, "Should return correct period");
        $this->assert(is_numeric($stats['total_validations']), "Total validations should be numeric");
        $this->assert(is_numeric($stats['success_rate']), "Success rate should be numeric");
        
        echo "✓ Validation Statistics tests completed\n\n";
    }
    
    /**
     * Test service integration scenarios
     */
    private function testServiceIntegrationScenarios() {
        echo "Testing Service Integration Scenarios...\n";
        
        // Clear existing validation data for clean test
        $clear_query = "
            UPDATE tbl_bm2 SET 
                v_status = NULL, v_match_level = NULL, v_confidence_score = NULL,
                v_validated_at = NULL, v_postcode = NULL, v_town = NULL
            WHERE bm_order_id = ?
        ";
        
        $stmt = mysqli_prepare($this->conn, $clear_query);
        if ($stmt) {
            mysqli_stmt_bind_param($stmt, "s", $this->test_bm_order_id);
            mysqli_stmt_execute($stmt);
            mysqli_stmt_close($stmt);
        }
        
        // Test complete validation workflow (this will fail due to API key, but we test the structure)
        $result = $this->service->validateOrderAddressWithErrorHandling($this->test_bm_order_id);
        
        // Since we don't have a real API key, this should fail with configuration error
        $this->assert($result['success'] === false, "Should fail without valid API key");
        $this->assert(
            $result['error_type'] === 'configuration_error' || 
            $result['error_type'] === 'authentication_error' ||
            $result['error_type'] === 'api_error',
            "Should return appropriate error type for API issues"
        );
        
        // Test debug message collection
        $debug_messages = $this->service->getDebugMessages();
        $this->assert(!empty($debug_messages), "Should collect debug messages");
        $this->assert(strpos($debug_messages, 'AddressValidationService') !== false, "Debug messages should include service name");
        
        echo "✓ Service Integration Scenarios tests completed\n\n";
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
        
        echo "\nAddressValidationService Integration Tests " . ($this->passed_count === $this->test_count ? "PASSED" : "FAILED") . "\n";
    }
}

// Run tests if called directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    try {
        $test = new AddressValidationServiceTest();
        $test->runAllTests();
    } catch (Exception $e) {
        echo "Error running tests: " . $e->getMessage() . "\n";
        exit(1);
    }
}

?>