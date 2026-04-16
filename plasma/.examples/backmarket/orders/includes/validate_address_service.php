<?php

/**
 * Address Validation Service
 * 
 * Orchestrates the address validation workflow using Ideal Postcodes API
 * Integrates between BackMarket order fetch and DPD booking processes
 */

// Include required dependencies
require_once dirname(__DIR__, 3) . '/db_config.php';
require_once __DIR__ . '/AddressValidator.php';

/**
 * Address Validation Service Class
 * 
 * Handles the complete validation workflow including database operations
 */
class AddressValidationService {
    
    private $conn;
    private $validator;
    private $debug_mode;
    private $debug_messages = "";
    
    /**
     * Constructor
     * 
     * @param mysqli $connection Database connection
     * @param bool $debug_mode Enable debug logging
     */
    public function __construct($connection, $debug_mode = false) {
        $this->conn = $connection;
        $this->debug_mode = $debug_mode;
        
        // Initialize AddressValidator with API key from environment
        $api_key = $_ENV['IDEAL_POSTCODES_API_KEY'] ?? '';
        $config = [
            'debug' => $debug_mode,
            'timeout' => 10,
            'confidence_thresholds' => [
                'high' => 0.9,
                'medium' => 0.7,
                'low' => 0.5
            ]
        ];
        
        $this->validator = new AddressValidator($api_key, $config);
        $this->addDebug("AddressValidationService initialized");
    }
    
    /**
     * Add debug message following existing patterns
     * 
     * @param string $message Debug message
     */
    private function addDebug($message) {
        if ($this->debug_mode) {
            $this->debug_messages .= $message . "\n";
            error_log("AddressValidationService: " . $message);
        }
    }
    
    /**
     * Get debug messages
     * 
     * @return string All debug messages
     */
    public function getDebugMessages() {
        return $this->debug_messages;
    }
    
    /**
     * Main validation workflow orchestration method
     * 
     * @param string $bm_order_id BackMarket order ID
     * @return array Validation result
     */
    public function validateOrderAddress($bm_order_id) {
        $this->addDebug("Starting address validation workflow for BM Order ID: $bm_order_id");
        
        try {
            // Step 1: Load address data from tbl_bm2
            $address_data = $this->loadAddressData($bm_order_id);
            if (!$address_data['success']) {
                return $address_data;
            }
            
            $this->addDebug("Address data loaded successfully");
            
            // Step 2: Check if address has already been validated
            $existing_validation = $this->getExistingValidation($bm_order_id);
            if ($existing_validation['success'] && $existing_validation['has_validation']) {
                $this->addDebug("Using existing validation data");
                return [
                    'success' => true,
                    'validation_result' => $existing_validation['validation_data'],
                    'message' => 'Using existing validation data',
                    'debug' => $this->debug_messages
                ];
            }
            
            // Step 3: Validate address using AddressValidator
            $validation_result = $this->validator->validateAddress($address_data['address_data']);
            if (!$validation_result['success']) {
                $this->addDebug("Address validation failed: " . $validation_result['message']);
                return [
                    'success' => false,
                    'error_type' => $validation_result['error_type'] ?? 'validation_failed',
                    'message' => $validation_result['message'],
                    'details' => $validation_result['details'] ?? '',
                    'debug' => $this->debug_messages
                ];
            }
            
            $this->addDebug("Address validation completed with confidence: " . $validation_result['confidence_score']);
            
            // Step 4: Check if manual review is required
            $requires_manual_review = $this->validator->requiresManualReview(
                $validation_result['confidence_score'],
                $validation_result['corrections_made']
            );
            
            if ($requires_manual_review) {
                $this->addDebug("Manual review required for validation");
                
                // Store validation result with manual review flag
                $store_result = $this->storeValidationResult($bm_order_id, $validation_result, 3); // Status 3 = manual_review_required
                if (!$store_result['success']) {
                    return $store_result;
                }
                
                return [
                    'success' => false,
                    'error_type' => 'manual_review_required',
                    'message' => 'Address validation requires manual review due to low confidence or significant corrections',
                    'details' => 'Confidence: ' . $validation_result['confidence_score'] . ', Corrections: ' . implode(', ', $validation_result['corrections_made']),
                    'validation_data' => $validation_result,
                    'debug' => $this->debug_messages
                ];
            }
            
            // Step 5: Store validation result in database
            $store_result = $this->storeValidationResult($bm_order_id, $validation_result, 1); // Status 1 = validated
            if (!$store_result['success']) {
                return $store_result;
            }
            
            $this->addDebug("Validation result stored successfully");
            
            // Step 6: Return successful validation result
            return [
                'success' => true,
                'validation_result' => $validation_result,
                'message' => 'Address validation completed successfully',
                'debug' => $this->debug_messages
            ];
            
        } catch (Exception $e) {
            $this->addDebug("Exception in validation workflow: " . $e->getMessage());
            error_log("AddressValidationService exception: " . $e->getMessage());
            
            return [
                'success' => false,
                'error_type' => 'system_error',
                'message' => 'System error during address validation',
                'details' => $e->getMessage(),
                'debug' => $this->debug_messages
            ];
        }
    }
    
    /**
     * Load address data from tbl_bm2 for validation
     * 
     * @param string $bm_order_id BackMarket order ID
     * @return array Address data or error
     */
    private function loadAddressData($bm_order_id) {
        $this->addDebug("Loading address data from tbl_bm2 for BM Order ID: $bm_order_id");
        
        // Prepare query to fetch address data
        $stmt = mysqli_prepare($this->conn, "
            SELECT 
                first_name, last_name, phone, email,
                street, street_2, city, postal_code, country
            FROM tbl_bm2 
            WHERE bm_order_id = ? 
            LIMIT 1
        ");
        
        if (!$stmt) {
            $this->addDebug("Failed to prepare address data query: " . mysqli_error($this->conn));
            return [
                'success' => false,
                'error_type' => 'database_error',
                'message' => 'Failed to prepare address data query',
                'details' => mysqli_error($this->conn)
            ];
        }
        
        mysqli_stmt_bind_param($stmt, "s", $bm_order_id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        if (!$result) {
            $this->addDebug("Failed to execute address data query: " . mysqli_error($this->conn));
            mysqli_stmt_close($stmt);
            return [
                'success' => false,
                'error_type' => 'database_error',
                'message' => 'Failed to execute address data query',
                'details' => mysqli_error($this->conn)
            ];
        }
        
        if (mysqli_num_rows($result) === 0) {
            $this->addDebug("No address data found for BM Order ID: $bm_order_id");
            mysqli_stmt_close($stmt);
            return [
                'success' => false,
                'error_type' => 'data_not_found',
                'message' => 'No address data found for the specified order',
                'details' => "BM Order ID: $bm_order_id"
            ];
        }
        
        $address_data = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);
        
        // Validate required address fields
        $required_fields = ['street', 'city', 'postal_code'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (empty($address_data[$field])) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            $this->addDebug("Missing required address fields: " . implode(', ', $missing_fields));
            return [
                'success' => false,
                'error_type' => 'validation_failed',
                'message' => 'Missing required address fields',
                'details' => 'Missing fields: ' . implode(', ', $missing_fields)
            ];
        }
        
        $this->addDebug("Address data loaded successfully");
        
        return [
            'success' => true,
            'address_data' => $address_data
        ];
    }
    
    /**
     * Check if address has already been validated
     * 
     * @param string $bm_order_id BackMarket order ID
     * @return array Existing validation data or indication of no validation
     */
    private function getExistingValidation($bm_order_id) {
        $this->addDebug("Checking for existing validation data");
        
        // Check if validation columns exist first
        $columns_check = mysqli_query($this->conn, "SHOW COLUMNS FROM tbl_bm2 LIKE 'v_status'");
        if (!$columns_check || mysqli_num_rows($columns_check) === 0) {
            $this->addDebug("Validation columns not found - no existing validation");
            return [
                'success' => true,
                'has_validation' => false
            ];
        }
        
        // Query existing validation data
        $stmt = mysqli_prepare($this->conn, "
            SELECT 
                v_status, v_match_level, v_confidence_score, v_validated_at,
                v_building_number, v_thoroughfare, v_line_1, v_line_2, v_line_3, v_line_4,
                v_postcode, v_town, v_county, v_country
            FROM tbl_bm2 
            WHERE bm_order_id = ? AND v_status IS NOT NULL
            LIMIT 1
        ");
        
        if (!$stmt) {
            $this->addDebug("Failed to prepare existing validation query");
            return [
                'success' => true,
                'has_validation' => false
            ];
        }
        
        mysqli_stmt_bind_param($stmt, "s", $bm_order_id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        if (!$result || mysqli_num_rows($result) === 0) {
            $this->addDebug("No existing validation found");
            mysqli_stmt_close($stmt);
            return [
                'success' => true,
                'has_validation' => false
            ];
        }
        
        $validation_data = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);
        
        // Check if validation is still valid (status 1 = validated)
        if ($validation_data['v_status'] != 1) {
            $this->addDebug("Existing validation found but status is not validated (status: " . $validation_data['v_status'] . ")");
            return [
                'success' => true,
                'has_validation' => false
            ];
        }
        
        $this->addDebug("Found existing valid validation data");
        
        // Convert database format back to validation result format
        $existing_result = [
            'success' => true,
            'validated_address' => [
                'building_number' => $validation_data['v_building_number'],
                'thoroughfare' => $validation_data['v_thoroughfare'],
                'line_1' => $validation_data['v_line_1'],
                'line_2' => $validation_data['v_line_2'],
                'line_3' => $validation_data['v_line_3'],
                'line_4' => $validation_data['v_line_4'],
                'postcode' => $validation_data['v_postcode'],
                'post_town' => $validation_data['v_town'],
                'county' => $validation_data['v_county'],
                'country' => $validation_data['v_country']
            ],
            'match_level' => $validation_data['v_match_level'],
            'confidence_score' => floatval($validation_data['v_confidence_score']),
            'corrections_made' => [], // Not stored in database
            'validated_at' => $validation_data['v_validated_at']
        ];
        
        return [
            'success' => true,
            'has_validation' => true,
            'validation_data' => $existing_result
        ];
    }
    
    /**
     * Store validation result in database
     * 
     * @param string $bm_order_id BackMarket order ID
     * @param array $validation_result Validation result from AddressValidator
     * @param int $status Validation status (1=validated, 2=failed, 3=manual_review_required)
     * @return array Success or error result
     */
    private function storeValidationResult($bm_order_id, $validation_result, $status) {
        $this->addDebug("Storing validation result with status: $status");
        
        try {
            // Ensure validation columns exist
            $columns_result = $this->ensureValidationColumns();
            if (!$columns_result['success']) {
                return $columns_result;
            }
            
            // Extract validated address components
            $validated_address = $validation_result['validated_address'] ?? [];
            
            // Prepare validation metadata
            $api_response_json = json_encode($validation_result['raw_api_response'] ?? []);
            $current_timestamp = date('Y-m-d H:i:s');
            
            // Build update query
            $stmt = mysqli_prepare($this->conn, "
                UPDATE tbl_bm2 SET
                    v_status = ?,
                    v_match_level = ?,
                    v_confidence_score = ?,
                    v_api_response = ?,
                    v_validated_at = ?,
                    v_building_number = ?,
                    v_thoroughfare = ?,
                    v_line_1 = ?,
                    v_line_2 = ?,
                    v_line_3 = ?,
                    v_line_4 = ?,
                    v_postcode = ?,
                    v_town = ?,
                    v_county = ?,
                    v_country = ?
                WHERE bm_order_id = ?
            ");
            
            if (!$stmt) {
                $this->addDebug("Failed to prepare validation storage query: " . mysqli_error($this->conn));
                return [
                    'success' => false,
                    'error_type' => 'database_error',
                    'message' => 'Failed to prepare validation storage query',
                    'details' => mysqli_error($this->conn)
                ];
            }
            
            // Prepare variables for binding (required for pass by reference)
            $match_level = $validation_result['match_level'] ?? '';
            $confidence_score = $validation_result['confidence_score'] ?? 0.0;
            $building_number = $validated_address['building_number'] ?? '';
            $thoroughfare = $validated_address['thoroughfare'] ?? '';
            $line_1 = $validated_address['line_1'] ?? '';
            $line_2 = $validated_address['line_2'] ?? '';
            $line_3 = $validated_address['line_3'] ?? '';
            $line_4 = $validated_address['line_4'] ?? '';
            $postcode = $validated_address['postcode'] ?? '';
            $town = $validated_address['post_town'] ?? $validated_address['town'] ?? '';
            $county = $validated_address['county'] ?? '';
            $country = $validated_address['country'] ?? 'GB';
            
            // Bind parameters
            mysqli_stmt_bind_param($stmt, "isdsssssssssssss",
                $status,
                $match_level,
                $confidence_score,
                $api_response_json,
                $current_timestamp,
                $building_number,
                $thoroughfare,
                $line_1,
                $line_2,
                $line_3,
                $line_4,
                $postcode,
                $town,
                $county,
                $country,
                $bm_order_id
            );
            
            // Execute query
            if (!mysqli_stmt_execute($stmt)) {
                $this->addDebug("Failed to execute validation storage query: " . mysqli_stmt_error($stmt));
                mysqli_stmt_close($stmt);
                return [
                    'success' => false,
                    'error_type' => 'database_error',
                    'message' => 'Failed to store validation result',
                    'details' => mysqli_stmt_error($stmt)
                ];
            }
            
            $affected_rows = mysqli_stmt_affected_rows($stmt);
            mysqli_stmt_close($stmt);
            
            if ($affected_rows === 0) {
                $this->addDebug("No rows affected - BM Order ID may not exist: $bm_order_id");
                return [
                    'success' => false,
                    'error_type' => 'data_not_found',
                    'message' => 'Failed to store validation result - order not found',
                    'details' => "BM Order ID: $bm_order_id"
                ];
            }
            
            $this->addDebug("Validation result stored successfully ($affected_rows rows affected)");
            
            return [
                'success' => true,
                'message' => 'Validation result stored successfully'
            ];
            
        } catch (Exception $e) {
            $this->addDebug("Exception storing validation result: " . $e->getMessage());
            return [
                'success' => false,
                'error_type' => 'system_error',
                'message' => 'System error storing validation result',
                'details' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Retrieve validated address data for DPD booking
     * 
     * @param string $bm_order_id BackMarket order ID
     * @return array Validated address data or error
     */
    public function getValidatedAddressForDPD($bm_order_id) {
        $this->addDebug("Retrieving validated address data for DPD booking");
        
        // Query validated address data
        $stmt = mysqli_prepare($this->conn, "
            SELECT 
                first_name, last_name, phone, email, price,
                v_status, v_confidence_score, v_match_level,
                v_building_number, v_thoroughfare, v_line_1, v_line_2, v_line_3, v_line_4,
                v_postcode, v_town, v_county, v_country,
                street, street_2, city, postal_code, country
            FROM tbl_bm2 
            WHERE bm_order_id = ?
            LIMIT 1
        ");
        
        if (!$stmt) {
            $this->addDebug("Failed to prepare validated address query: " . mysqli_error($this->conn));
            return [
                'success' => false,
                'error_type' => 'database_error',
                'message' => 'Failed to prepare validated address query',
                'details' => mysqli_error($this->conn)
            ];
        }
        
        mysqli_stmt_bind_param($stmt, "s", $bm_order_id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        if (!$result || mysqli_num_rows($result) === 0) {
            $this->addDebug("No address data found for BM Order ID: $bm_order_id");
            mysqli_stmt_close($stmt);
            return [
                'success' => false,
                'error_type' => 'data_not_found',
                'message' => 'No address data found for the specified order',
                'details' => "BM Order ID: $bm_order_id"
            ];
        }
        
        $data = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);
        
        // Check if we have validated address data
        $has_validation = !empty($data['v_status']) && $data['v_status'] == 1;
        
        if ($has_validation) {
            $this->addDebug("Using validated address data for DPD booking");
            
            // Build validated address for DPD formatting
            $validated_address = [
                'building_number' => $data['v_building_number'],
                'thoroughfare' => $data['v_thoroughfare'],
                'line_1' => $data['v_line_1'],
                'line_2' => $data['v_line_2'],
                'line_3' => $data['v_line_3'],
                'line_4' => $data['v_line_4'],
                'postcode' => $data['v_postcode'],
                'post_town' => $data['v_town'],
                'county' => $data['v_county'],
                'country' => $data['v_country']
            ];
            
            // Original customer data
            $original_data = [
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'phone' => $data['phone'],
                'email' => $data['email']
            ];
            
            // Use AddressValidator to format for DPD
            $dpd_format_result = $this->validator->formatForDPD($validated_address, $original_data);
            
            if (!$dpd_format_result['success']) {
                return $dpd_format_result;
            }
            
            // Ensure price is included in the DPD address data
            $dpd_address_with_price = $dpd_format_result['dpd_address'];
            $dpd_address_with_price['price'] = $data['price'] ?? '0.00';
            
            return [
                'success' => true,
                'address_data' => $dpd_address_with_price,
                'validated_components' => $dpd_format_result['validated_components'],
                'validation_info' => [
                    'confidence_score' => floatval($data['v_confidence_score']),
                    'match_level' => $data['v_match_level'],
                    'is_validated' => true
                ]
            ];
            
        } else {
            $this->addDebug("No validated address data found, using original address");
            
            // Return original address data
            return [
                'success' => true,
                'address_data' => [
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'phone' => $data['phone'],
                    'email' => $data['email'],
                    'street' => $data['street'],
                    'street_2' => $data['street_2'],
                    'city' => $data['city'],
                    'postal_code' => $data['postal_code'],
                    'country' => $data['country'],
                    'price' => $data['price'] ?? '0.00'
                ],
                'validation_info' => [
                    'is_validated' => false
                ]
            ];
        }
    }
    
    /**
     * Ensure validation columns exist in tbl_bm2
     * 
     * @return array Success or error result
     */
    private function ensureValidationColumns() {
        $this->addDebug("Ensuring validation columns exist in tbl_bm2");
        
        // Define validation columns to add
        $validation_columns = [
            'v_status' => 'INT(11) DEFAULT NULL COMMENT "Validation status: 0=not validated, 1=validated, 2=failed, 3=manual_review_required, 4=fallback_used"',
            'v_match_level' => 'VARCHAR(50) DEFAULT NULL COMMENT "Match level from Ideal Postcodes API"',
            'v_confidence_score' => 'DECIMAL(3,2) DEFAULT NULL COMMENT "Validation confidence score 0.00-1.00"',
            'v_api_response' => 'TEXT DEFAULT NULL COMMENT "Full API response for debugging"',
            'v_validated_at' => 'TIMESTAMP DEFAULT NULL COMMENT "When validation was performed"',
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
        
        try {
            foreach ($validation_columns as $column_name => $column_definition) {
                // Check if column exists
                $check_stmt = mysqli_prepare($this->conn, "SHOW COLUMNS FROM tbl_bm2 LIKE ?");
                if (!$check_stmt) {
                    $this->addDebug("Failed to prepare column check query for $column_name");
                    continue;
                }
                
                mysqli_stmt_bind_param($check_stmt, "s", $column_name);
                mysqli_stmt_execute($check_stmt);
                $check_result = mysqli_stmt_get_result($check_stmt);
                
                if (mysqli_num_rows($check_result) == 0) {
                    // Column doesn't exist, add it
                    $alter_query = "ALTER TABLE tbl_bm2 ADD COLUMN `$column_name` $column_definition";
                    
                    if (mysqli_query($this->conn, $alter_query)) {
                        $this->addDebug("Added validation column: $column_name");
                    } else {
                        $this->addDebug("Failed to add validation column $column_name: " . mysqli_error($this->conn));
                        mysqli_stmt_close($check_stmt);
                        return [
                            'success' => false,
                            'error_type' => 'database_error',
                            'message' => "Failed to add validation column: $column_name",
                            'details' => mysqli_error($this->conn)
                        ];
                    }
                }
                
                mysqli_stmt_close($check_stmt);
            }
            
            $this->addDebug("All validation columns ensured");
            return ['success' => true];
            
        } catch (Exception $e) {
            $this->addDebug("Exception ensuring validation columns: " . $e->getMessage());
            return [
                'success' => false,
                'error_type' => 'system_error',
                'message' => 'System error ensuring validation columns',
                'details' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get validation statistics for monitoring
     * 
     * @param int $days Number of days to look back (default 30)
     * @return array Validation statistics
     */
    public function getValidationStatistics($days = 30) {
        $this->addDebug("Getting validation statistics for last $days days");
        
        $date_threshold = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $stats_query = "
            SELECT 
                COUNT(*) as total_validations,
                SUM(CASE WHEN v_status = 1 THEN 1 ELSE 0 END) as successful_validations,
                SUM(CASE WHEN v_status = 2 THEN 1 ELSE 0 END) as failed_validations,
                SUM(CASE WHEN v_status = 3 THEN 1 ELSE 0 END) as manual_review_required,
                AVG(v_confidence_score) as avg_confidence_score,
                COUNT(CASE WHEN v_match_level = 'high' THEN 1 END) as high_confidence_matches,
                COUNT(CASE WHEN v_match_level = 'medium' THEN 1 END) as medium_confidence_matches,
                COUNT(CASE WHEN v_match_level = 'low' THEN 1 END) as low_confidence_matches
            FROM tbl_bm2 
            WHERE v_validated_at >= ? AND v_status IS NOT NULL
        ";
        
        $stmt = mysqli_prepare($this->conn, $stats_query);
        if (!$stmt) {
            return [
                'success' => false,
                'error_type' => 'database_error',
                'message' => 'Failed to prepare statistics query'
            ];
        }
        
        mysqli_stmt_bind_param($stmt, "s", $date_threshold);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        if (!$result) {
            mysqli_stmt_close($stmt);
            return [
                'success' => false,
                'error_type' => 'database_error',
                'message' => 'Failed to execute statistics query'
            ];
        }
        
        $stats = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);
        
        return [
            'success' => true,
            'statistics' => [
                'period_days' => $days,
                'total_validations' => intval($stats['total_validations']),
                'successful_validations' => intval($stats['successful_validations']),
                'failed_validations' => intval($stats['failed_validations']),
                'manual_review_required' => intval($stats['manual_review_required']),
                'success_rate' => $stats['total_validations'] > 0 ? 
                    round(($stats['successful_validations'] / $stats['total_validations']) * 100, 2) : 0,
                'average_confidence_score' => round(floatval($stats['avg_confidence_score']), 2),
                'match_level_distribution' => [
                    'high' => intval($stats['high_confidence_matches']),
                    'medium' => intval($stats['medium_confidence_matches']),
                    'low' => intval($stats['low_confidence_matches'])
                ]
            ]
        ];
    }
    
    /**
     * Handle API failures with appropriate error responses
     * 
     * @param array $api_error API error details
     * @return array Structured error response
     */
    private function handleApiFailure($api_error) {
        $this->addDebug("Handling API failure: " . json_encode($api_error));
        
        $error_type = $api_error['error_type'] ?? 'api_error';
        $message = $api_error['message'] ?? 'API request failed';
        $details = $api_error['details'] ?? '';
        
        // Handle specific API error types
        switch ($error_type) {
            case 'configuration_error':
                return [
                    'success' => false,
                    'error_type' => 'configuration_error',
                    'message' => 'Address validation service is not properly configured',
                    'details' => 'Please check API key configuration',
                    'requires_manual_review' => true,
                    'debug' => $this->debug_messages
                ];
                
            case 'api_error':
                // Check for specific API error conditions
                if (strpos($message, 'rate limit') !== false || strpos($message, '429') !== false) {
                    return [
                        'success' => false,
                        'error_type' => 'rate_limit_exceeded',
                        'message' => 'Address validation API rate limit exceeded',
                        'details' => 'Please try again later or contact support',
                        'retry_after' => 300, // 5 minutes
                        'debug' => $this->debug_messages
                    ];
                }
                
                if (strpos($message, 'Invalid API key') !== false || strpos($message, '401') !== false) {
                    return [
                        'success' => false,
                        'error_type' => 'authentication_error',
                        'message' => 'Address validation API authentication failed',
                        'details' => 'API key is invalid or expired',
                        'requires_manual_review' => true,
                        'debug' => $this->debug_messages
                    ];
                }
                
                if (strpos($message, 'server error') !== false || strpos($message, '5') === 0) {
                    return [
                        'success' => false,
                        'error_type' => 'api_server_error',
                        'message' => 'Address validation API server error',
                        'details' => 'The validation service is temporarily unavailable',
                        'retry_after' => 600, // 10 minutes
                        'debug' => $this->debug_messages
                    ];
                }
                
                // Generic API error
                return [
                    'success' => false,
                    'error_type' => 'api_error',
                    'message' => 'Address validation API error',
                    'details' => $details,
                    'debug' => $this->debug_messages
                ];
                
            case 'validation_failed':
                return [
                    'success' => false,
                    'error_type' => 'validation_failed',
                    'message' => 'Address could not be validated',
                    'details' => $details,
                    'requires_manual_review' => true,
                    'debug' => $this->debug_messages
                ];
                
            default:
                return [
                    'success' => false,
                    'error_type' => $error_type,
                    'message' => $message,
                    'details' => $details,
                    'debug' => $this->debug_messages
                ];
        }
    }
    
    /**
     * Handle database errors with appropriate error responses
     * 
     * @param string $operation Operation that failed
     * @param string $error_message Database error message
     * @return array Structured error response
     */
    private function handleDatabaseError($operation, $error_message) {
        $this->addDebug("Database error in $operation: $error_message");
        
        // Check for specific database error conditions
        if (strpos($error_message, 'Connection') !== false || strpos($error_message, 'connect') !== false) {
            return [
                'success' => false,
                'error_type' => 'database_connection_error',
                'message' => 'Database connection failed',
                'details' => 'Unable to connect to the database',
                'debug' => $this->debug_messages
            ];
        }
        
        if (strpos($error_message, 'Table') !== false && strpos($error_message, "doesn't exist") !== false) {
            return [
                'success' => false,
                'error_type' => 'database_schema_error',
                'message' => 'Database schema error',
                'details' => 'Required database table is missing',
                'debug' => $this->debug_messages
            ];
        }
        
        if (strpos($error_message, 'Column') !== false && strpos($error_message, "doesn't exist") !== false) {
            return [
                'success' => false,
                'error_type' => 'database_schema_error',
                'message' => 'Database schema error',
                'details' => 'Required database column is missing',
                'debug' => $this->debug_messages
            ];
        }
        
        // Generic database error
        return [
            'success' => false,
            'error_type' => 'database_error',
            'message' => "Database error in $operation",
            'details' => $error_message,
            'debug' => $this->debug_messages
        ];
    }
    
    /**
     * Validate address data before processing
     * 
     * @param array $address_data Address data to validate
     * @return array Validation result
     */
    private function validateAddressData($address_data) {
        $this->addDebug("Validating address data before processing");
        
        $errors = [];
        
        // Check required fields
        $required_fields = [
            'street' => 'Street address',
            'city' => 'City',
            'postal_code' => 'Postal code'
        ];
        
        foreach ($required_fields as $field => $label) {
            if (empty($address_data[$field])) {
                $errors[] = "$label is required";
            }
        }
        
        // Validate postal code format (basic UK postcode validation)
        if (!empty($address_data['postal_code'])) {
            $postcode = strtoupper(str_replace(' ', '', $address_data['postal_code']));
            if (!preg_match('/^[A-Z]{1,2}[0-9R][0-9A-Z]?[0-9][ABD-HJLNP-UW-Z]{2}$/', $postcode)) {
                $errors[] = 'Postal code format is invalid';
            }
        }
        
        // Check for non-mainland UK addresses that require manual processing
        if (!empty($address_data['postal_code'])) {
            $postal_code_prefix = strtoupper(substr($address_data['postal_code'], 0, 2));
            
            // Northern Ireland requires manual processing due to additional documentation
            if ($postal_code_prefix === 'BT') {
                $errors[] = 'Northern Ireland addresses require manual processing due to additional shipping documentation requirements';
            }
            
            // Other offshore addresses
            $offshore_prefixes = ['JY', 'IM', 'GY']; // Jersey, Isle of Man, Guernsey
            if (in_array($postal_code_prefix, $offshore_prefixes)) {
                $errors[] = 'Offshore addresses (Jersey, Isle of Man, Guernsey) require manual processing';
            }
        }
        
        // Check country (should be GB for UK addresses)
        if (!empty($address_data['country']) && $address_data['country'] !== 'GB') {
            $errors[] = 'Only UK addresses are supported for validation';
        }
        
        // Validate field lengths
        $field_limits = [
            'street' => 255,
            'street_2' => 255,
            'city' => 255,
            'postal_code' => 20,
            'first_name' => 100,
            'last_name' => 100,
            'phone' => 50,
            'email' => 255
        ];
        
        foreach ($field_limits as $field => $limit) {
            if (!empty($address_data[$field]) && strlen($address_data[$field]) > $limit) {
                $errors[] = ucfirst(str_replace('_', ' ', $field)) . " is too long (maximum $limit characters)";
            }
        }
        
        if (!empty($errors)) {
            return [
                'success' => false,
                'error_type' => 'validation_failed',
                'message' => 'Address data validation failed',
                'details' => implode('; ', $errors)
            ];
        }
        
        return ['success' => true];
    }
    
    /**
     * Create structured error response for manual review scenarios
     * 
     * @param string $reason Reason for manual review
     * @param array $validation_result Validation result data
     * @param array $additional_info Additional information
     * @return array Manual review error response
     */
    private function createManualReviewResponse($reason, $validation_result = [], $additional_info = []) {
        $this->addDebug("Creating manual review response: $reason");
        
        $response = [
            'success' => false,
            'error_type' => 'manual_review_required',
            'message' => 'Address validation requires manual review',
            'reason' => $reason,
            'requires_manual_review' => true,
            'debug' => $this->debug_messages
        ];
        
        // Add validation details if available
        if (!empty($validation_result)) {
            $response['validation_details'] = [
                'confidence_score' => $validation_result['confidence_score'] ?? 0,
                'match_level' => $validation_result['match_level'] ?? 'unknown',
                'corrections_made' => $validation_result['corrections_made'] ?? []
            ];
        }
        
        // Add additional information
        if (!empty($additional_info)) {
            $response['additional_info'] = $additional_info;
        }
        
        // Add specific guidance based on reason
        switch ($reason) {
            case 'low_confidence':
                $response['guidance'] = 'The address validation returned low confidence results. Please verify the address manually.';
                break;
                
            case 'significant_corrections':
                $response['guidance'] = 'Significant corrections were made to the address. Please review and confirm the changes.';
                break;
                
            case 'postcode_correction':
                $response['guidance'] = 'The postcode was corrected during validation. Please verify the corrected postcode is acceptable.';
                break;
                
            case 'api_unavailable':
                $response['guidance'] = 'The address validation service is currently unavailable. Please validate the address manually.';
                break;
                
            case 'configuration_error':
                $response['guidance'] = 'The address validation service is not properly configured. Please contact system administrator.';
                break;
                
            default:
                $response['guidance'] = 'Please review the address details and validate manually if necessary.';
        }
        
        return $response;
    }
    
    /**
     * Get address suggestions using autocomplete API when exact match fails
     * 
     * @param array $address_data Original address data
     * @return array Address suggestions
     */
    private function getAddressSuggestions($address_data) {
        $this->addDebug("Getting address suggestions for failed validation");
        
        try {
            // Build query from address components
            $query_parts = [];
            if (!empty($address_data['street'])) {
                $query_parts[] = $address_data['street'];
            }
            if (!empty($address_data['street_2'])) {
                $query_parts[] = $address_data['street_2'];
            }
            if (!empty($address_data['city'])) {
                $query_parts[] = $address_data['city'];
            }
            if (!empty($address_data['postal_code'])) {
                $query_parts[] = $address_data['postal_code'];
            }
            
            $query = implode(' ', $query_parts);
            
            // Call autocomplete API
            $autocomplete_url = $this->validator->getApiBaseUrl() . '/autocomplete/addresses';
            $request_data = [
                'api_key' => $this->validator->getApiKey(),
                'query' => $query,
                'limit' => 5 // Get top 5 suggestions
            ];
            
            $response = $this->makeAutocompleteRequest($autocomplete_url . '?' . http_build_query($request_data));
            
            if ($response['success'] && !empty($response['data']['result']['hits'])) {
                $suggestions = [];
                foreach ($response['data']['result']['hits'] as $hit) {
                    $suggestions[] = [
                        'suggestion' => $hit['suggestion'],
                        'udprn' => $hit['udprn'],
                        'id' => $hit['id']
                    ];
                }
                
                $this->addDebug("Found " . count($suggestions) . " address suggestions");
                return $suggestions;
            }
            
        } catch (Exception $e) {
            $this->addDebug("Error getting address suggestions: " . $e->getMessage());
        }
        
        return [];
    }
    
    /**
     * Make autocomplete API request
     * 
     * @param string $url Request URL
     * @return array Response data
     */
    private function makeAutocompleteRequest($url) {
        $ch = curl_init();
        
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'S4D-AddressValidator/1.0'
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            return [
                'success' => false,
                'error' => "Network error: $curl_error"
            ];
        }
        
        if ($http_code >= 400) {
            return [
                'success' => false,
                'error' => "HTTP $http_code error"
            ];
        }
        
        $decoded_response = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => 'Invalid JSON response'
            ];
        }
        
        return [
            'success' => true,
            'data' => $decoded_response
        ];
    }
    
    /**
     * Log validation events for monitoring and debugging
     * 
     * @param string $event_type Type of event
     * @param string $bm_order_id BackMarket order ID
     * @param array $event_data Event data
     */
    private function logValidationEvent($event_type, $bm_order_id, $event_data = []) {
        $log_message = "AddressValidation [$event_type] BM Order: $bm_order_id";
        
        if (!empty($event_data)) {
            $log_message .= " Data: " . json_encode($event_data);
        }
        
        error_log($log_message);
        $this->addDebug("Event logged: $event_type");
    }
    
    /**
     * Enhanced validation workflow with comprehensive error handling
     * 
     * @param string $bm_order_id BackMarket order ID
     * @return array Validation result with enhanced error handling
     */
    public function validateOrderAddressWithErrorHandling($bm_order_id) {
        $this->addDebug("Starting enhanced address validation workflow for BM Order ID: $bm_order_id");
        
        try {
            // Log validation start
            $this->logValidationEvent('validation_started', $bm_order_id);
            
            // Step 1: Load and validate address data
            $address_result = $this->loadAddressData($bm_order_id);
            if (!$address_result['success']) {
                $this->logValidationEvent('data_load_failed', $bm_order_id, ['error' => $address_result['message']]);
                return $this->handleDatabaseError('address data loading', $address_result['details'] ?? $address_result['message']);
            }
            
            // Step 2: Validate address data format
            $validation_check = $this->validateAddressData($address_result['address_data']);
            if (!$validation_check['success']) {
                $this->logValidationEvent('data_validation_failed', $bm_order_id, ['error' => $validation_check['details']]);
                
                // For non-mainland UK addresses, return specific error for manual processing
                if (strpos($validation_check['details'], 'Northern Ireland') !== false) {
                    return [
                        'success' => false,
                        'error_type' => 'northern_ireland_manual_required',
                        'message' => 'Northern Ireland Address - Manual Processing Required',
                        'details' => 'Northern Ireland shipments require additional documentation and must be processed manually.',
                        'guidance' => 'Please use the manual DPD booking process for this order.',
                        'debug' => $this->debug_messages
                    ];
                }
                
                if (strpos($validation_check['details'], 'Offshore addresses') !== false) {
                    return [
                        'success' => false,
                        'error_type' => 'offshore_manual_required',
                        'message' => 'Offshore Address - Manual Processing Required',
                        'details' => 'Offshore addresses require special handling and must be processed manually.',
                        'guidance' => 'Please use the manual DPD booking process for this order.',
                        'debug' => $this->debug_messages
                    ];
                }
                
                return $validation_check;
            }
            
            // Step 3: Check for existing validation
            $existing_validation = $this->getExistingValidation($bm_order_id);
            if ($existing_validation['success'] && $existing_validation['has_validation']) {
                $this->logValidationEvent('existing_validation_used', $bm_order_id);
                return [
                    'success' => true,
                    'validation_result' => $existing_validation['validation_data'],
                    'message' => 'Using existing validation data',
                    'debug' => $this->debug_messages
                ];
            }
            
            // Step 4: Perform API validation with error handling
            $validation_result = $this->validator->validateAddress($address_result['address_data']);
            
            if (!$validation_result['success']) {
                $this->logValidationEvent('api_validation_failed', $bm_order_id, [
                    'error_type' => $validation_result['error_type'] ?? 'unknown',
                    'message' => $validation_result['message']
                ]);
                
                // Store failed validation attempt
                $this->storeValidationResult($bm_order_id, $validation_result, 2); // Status 2 = failed
                
                // For address not found cases, try autocomplete suggestions
                if ($validation_result['error_type'] === 'validation_failed' && 
                    strpos($validation_result['message'], 'No matching addresses found') !== false) {
                    
                    $this->addDebug("Address not found - attempting autocomplete suggestions");
                    $suggestions = $this->getAddressSuggestions($address_result['address_data']);
                    
                    if (!empty($suggestions)) {
                        return [
                            'success' => false,
                            'error_type' => 'address_suggestions_available',
                            'message' => 'Address not found - similar addresses available',
                            'details' => 'The exact address could not be validated, but similar addresses were found.',
                            'suggestions' => $suggestions,
                            'original_address' => $address_result['address_data'],
                            'guidance' => 'Please select the correct address from the suggestions or edit the address manually.',
                            'debug' => $this->debug_messages
                        ];
                    }
                }
                
                return $this->handleApiFailure($validation_result);
            }
            
            // Step 5: Assess if manual review is required
            $requires_manual_review = $this->validator->requiresManualReview(
                $validation_result['confidence_score'],
                $validation_result['corrections_made']
            );
            
            if ($requires_manual_review) {
                $this->logValidationEvent('manual_review_required', $bm_order_id, [
                    'confidence_score' => $validation_result['confidence_score'],
                    'corrections_made' => $validation_result['corrections_made']
                ]);
                
                // Store validation result with manual review flag
                $store_result = $this->storeValidationResult($bm_order_id, $validation_result, 3); // Status 3 = manual_review_required
                
                // Determine specific reason for manual review
                $review_reason = 'low_confidence';
                if (in_array('postcode', $validation_result['corrections_made'])) {
                    $review_reason = 'postcode_correction';
                } elseif (count($validation_result['corrections_made']) >= 2) {
                    $review_reason = 'significant_corrections';
                }
                
                return $this->createManualReviewResponse($review_reason, $validation_result);
            }
            
            // Step 6: Store successful validation result
            $store_result = $this->storeValidationResult($bm_order_id, $validation_result, 1); // Status 1 = validated
            if (!$store_result['success']) {
                $this->logValidationEvent('storage_failed', $bm_order_id, ['error' => $store_result['message']]);
                return $this->handleDatabaseError('validation result storage', $store_result['details'] ?? $store_result['message']);
            }
            
            // Log successful validation
            $this->logValidationEvent('validation_completed', $bm_order_id, [
                'confidence_score' => $validation_result['confidence_score'],
                'match_level' => $validation_result['match_level']
            ]);
            
            return [
                'success' => true,
                'validation_result' => $validation_result,
                'message' => 'Address validation completed successfully',
                'debug' => $this->debug_messages
            ];
            
        } catch (Exception $e) {
            $this->logValidationEvent('system_error', $bm_order_id, [
                'exception' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            error_log("AddressValidationService critical error: " . $e->getMessage() . " in " . $e->getFile() . " line " . $e->getLine());
            
            return [
                'success' => false,
                'error_type' => 'system_error',
                'message' => 'Critical system error during address validation',
                'details' => 'Please contact system administrator',
                'requires_manual_review' => true,
                'debug' => $this->debug_messages
            ];
        }
    }
}

// If called directly (not included), handle command line execution
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    
    // Check if BM order ID is provided
    if ($argc < 2) {
        echo json_encode([
            'success' => false,
            'message' => 'BackMarket order ID is required',
            'usage' => 'php validate_address_service.php <bm_order_id> [debug]'
        ]);
        exit(1);
    }
    
    $bm_order_id = $argv[1];
    $debug_mode = isset($argv[2]) && $argv[2] === 'debug';
    
    // Ensure database connection
    if (!$conn || mysqli_connect_errno()) {
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed',
            'details' => mysqli_connect_error()
        ]);
        exit(1);
    }
    
    // Ensure we use the correct database
    if (!mysqli_select_db($conn, 's4d_england_db')) {
        echo json_encode([
            'success' => false,
            'message' => 'Failed to select database',
            'details' => mysqli_error($conn)
        ]);
        exit(1);
    }
    
    // Create validation service and run validation with enhanced error handling
    $validation_service = new AddressValidationService($conn, $debug_mode);
    $result = $validation_service->validateOrderAddressWithErrorHandling($bm_order_id);
    
    // Output result as JSON
    echo json_encode($result);
    
    // Exit with appropriate code
    exit($result['success'] ? 0 : 1);
}

?>