<?php

/**
 * AddressValidator Class
 * 
 * Integrates with Ideal Postcodes API to validate UK addresses
 * for the BackMarket to DPD shipping workflow
 */
class AddressValidator {
    
    private $api_key;
    private $api_base_url;
    private $confidence_thresholds;
    private $debug_mode;
    private $timeout;
    
    /**
     * Constructor
     * 
     * @param string $api_key Ideal Postcodes API key
     * @param array $config Configuration options
     */
    public function __construct($api_key, $config = []) {
        $this->api_key = $api_key;
        $this->api_base_url = $config['api_base_url'] ?? 'https://api.ideal-postcodes.co.uk/v1';
        $this->timeout = $config['timeout'] ?? 10;
        $this->debug_mode = $config['debug'] ?? false;
        
        // Default confidence thresholds (adjusted for cleanse endpoint)
        $this->confidence_thresholds = array_merge([
            'high' => 0.8,    // 80%+ confidence
            'medium' => 0.6,  // 60%+ confidence  
            'low' => 0.4      // 40%+ confidence
        ], $config['confidence_thresholds'] ?? []);
    }
    
    /**
     * Add debug message following existing patterns
     * 
     * @param string $message Debug message
     */
    private function addDebug($message) {
        if ($this->debug_mode) {
            error_log("AddressValidator: " . $message);
        }
    }
    
    /**
     * Validate API key availability
     * 
     * @return array Validation result
     */
    public function validateApiKey() {
        $this->addDebug("Validating API key availability");
        
        if (empty($this->api_key)) {
            return [
                'success' => false,
                'error_type' => 'configuration_error',
                'message' => 'API key is not configured',
                'details' => 'IDEAL_POSTCODES_API_KEY environment variable is missing or empty'
            ];
        }
        
        // Test API key with a simple request
        $test_url = $this->api_base_url . '/keys/' . $this->api_key;
        $response = $this->makeApiRequest($test_url, 'GET');
        
        if (!$response['success']) {
            return [
                'success' => false,
                'error_type' => 'api_error',
                'message' => 'API key validation failed',
                'details' => $response['error']
            ];
        }
        
        $this->addDebug("API key validation successful");
        return ['success' => true];
    }
    
    /**
     * Make HTTP request to API using cURL
     * 
     * @param string $url Request URL
     * @param string $method HTTP method
     * @param array $data Request data
     * @return array Response data
     */
    private function makeApiRequest($url, $method = 'GET', $data = null) {
        $this->addDebug("Making API request to: $url");
        
        $ch = curl_init();
        
        // Basic cURL options
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_USERAGENT => 'S4D-AddressValidator/1.0'
        ]);
        
        // Set method and data
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            if ($data) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen(json_encode($data))
                ]);
            }
        }
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            $this->addDebug("cURL error: $curl_error");
            return [
                'success' => false,
                'error' => "Network error: $curl_error",
                'http_code' => 0
            ];
        }
        
        $this->addDebug("API response HTTP code: $http_code");
        
        if ($http_code >= 400) {
            $error_data = json_decode($response, true);
            $error_message = $error_data['message'] ?? "HTTP $http_code error";
            
            // Handle specific error codes
            if ($http_code === 401) {
                $error_message = "Invalid API key";
            } elseif ($http_code === 429) {
                $error_message = "API rate limit exceeded";
            } elseif ($http_code >= 500) {
                $error_message = "API server error";
            }
            
            return [
                'success' => false,
                'error' => $error_message,
                'http_code' => $http_code,
                'response' => $response
            ];
        }
        
        $decoded_response = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => 'Invalid JSON response from API',
                'http_code' => $http_code,
                'response' => $response
            ];
        }
        
        return [
            'success' => true,
            'data' => $decoded_response,
            'http_code' => $http_code
        ];
    }
    
    /**
     * Call Ideal Postcodes Address Cleanse API
     * 
     * @param array $address_components Address components to validate
     * @return array API response
     */
    public function cleanseAddress($address_components) {
        $this->addDebug("Starting address cleanse for: " . json_encode($address_components));
        
        // Validate required components
        if (empty($address_components['line_1']) && empty($address_components['thoroughfare'])) {
            return [
                'success' => false,
                'error_type' => 'validation_failed',
                'message' => 'Address line 1 or thoroughfare is required',
                'details' => 'At least one address line must be provided'
            ];
        }
        
        // Build API request URL - using cleanse endpoint
        $cleanse_url = $this->api_base_url . '/cleanse/addresses?api_key=' . $this->api_key;
        
        // Prepare request data for cleanse endpoint (JSON POST)
        $request_data = [
            'query' => $this->buildAddressQuery($address_components)
        ];
        
        // Add optional parameters if available
        if (!empty($address_components['postcode'])) {
            $request_data['postcode'] = $address_components['postcode'];
        }
        
        if (!empty($address_components['town'])) {
            $request_data['post_town'] = $address_components['town'];
        }
        
        // Make API request (POST with JSON)
        $response = $this->makeApiRequest($cleanse_url, 'POST', $request_data);
        
        if (!$response['success']) {
            $this->addDebug("Address cleanse API request failed: " . $response['error']);
            return [
                'success' => false,
                'error_type' => 'api_error',
                'message' => 'Address cleanse API request failed',
                'details' => $response['error']
            ];
        }
        
        $api_data = $response['data'];
        
        // Check if API returned results (cleanse format)
        if (empty($api_data['result']['match'])) {
            $this->addDebug("No address matches found");
            return [
                'success' => false,
                'error_type' => 'validation_failed',
                'message' => 'No matching addresses found',
                'details' => 'The provided address could not be matched to any known UK addresses'
            ];
        }
        
        $match = $api_data['result']['match'];
        $this->addDebug("Address cleanse successful, confidence: " . ($api_data['result']['confidence'] ?? 'N/A'));
        
        // Add cleanse-specific metadata to the match
        $match['cleanse_confidence'] = $api_data['result']['confidence'] ?? 0;
        $match['cleanse_fit'] = $api_data['result']['fit'] ?? 0;
        $match['match_analysis'] = [
            'organisation_match' => $api_data['result']['organisation_match'] ?? 'NA',
            'premise_match' => $api_data['result']['premise_match'] ?? 'NA',
            'postcode_match' => $api_data['result']['postcode_match'] ?? 'NA',
            'thoroughfare_match' => $api_data['result']['thoroughfare_match'] ?? 'NA',
            'locality_match' => $api_data['result']['locality_match'] ?? 'NA',
            'post_town_match' => $api_data['result']['post_town_match'] ?? 'NA'
        ];
        
        return [
            'success' => true,
            'results' => [$match], // Cleanse returns single result
            'raw_response' => $api_data
        ];
    }
    
    /**
     * Build address query string from components
     * 
     * @param array $address_components Address components
     * @return string Formatted address query
     */
    private function buildAddressQuery($address_components) {
        $query_parts = [];
        
        // Add address lines in order of preference
        if (!empty($address_components['line_1'])) {
            $query_parts[] = trim($address_components['line_1']);
        } elseif (!empty($address_components['thoroughfare'])) {
            $query_parts[] = trim($address_components['thoroughfare']);
        }
        
        if (!empty($address_components['line_2'])) {
            $query_parts[] = trim($address_components['line_2']);
        }
        
        if (!empty($address_components['line_3'])) {
            $query_parts[] = trim($address_components['line_3']);
        }
        
        if (!empty($address_components['town']) || !empty($address_components['city'])) {
            $town = !empty($address_components['town']) ? $address_components['town'] : $address_components['city'];
            $query_parts[] = trim($town);
        }
        
        if (!empty($address_components['county'])) {
            $query_parts[] = trim($address_components['county']);
        }
        
        return implode(', ', array_filter($query_parts));
    }
    
    /**
     * Main address validation method
     * 
     * @param array $address_data Address data from database
     * @return array Validation result
     */
    public function validateAddress($address_data) {
        $this->addDebug("Starting address validation");
        
        // First validate API key
        $api_validation = $this->validateApiKey();
        if (!$api_validation['success']) {
            return $api_validation;
        }
        
        // Convert database format to API format
        $address_components = $this->convertDatabaseToApiFormat($address_data);
        
        // Call cleanse API
        $cleanse_result = $this->cleanseAddress($address_components);
        
        if (!$cleanse_result['success']) {
            return $cleanse_result;
        }
        
        // Process the first (best) result
        $best_match = $cleanse_result['results'][0];
        
        // Assess match quality and confidence
        $confidence_assessment = $this->assessMatchQuality($best_match, $address_components);
        
        $this->addDebug("Validation completed with confidence: " . $confidence_assessment['confidence_score']);
        
        return [
            'success' => true,
            'validated_address' => $best_match,
            'match_level' => $confidence_assessment['match_level'],
            'confidence_score' => $confidence_assessment['confidence_score'],
            'corrections_made' => $confidence_assessment['corrections_made'],
            'original_address' => $address_components,
            'raw_api_response' => $cleanse_result['raw_response']
        ];
    }
    
    /**
     * Convert database address format to API format
     * 
     * @param array $address_data Address data from database
     * @return array Formatted address components
     */
    private function convertDatabaseToApiFormat($address_data) {
        return [
            'line_1' => $address_data['street'] ?? '',
            'line_2' => $address_data['street_2'] ?? '',
            'town' => $address_data['city'] ?? '',
            'postcode' => $address_data['postal_code'] ?? '',
            'county' => $address_data['county'] ?? '',
            'country' => $address_data['country'] ?? 'GB'
        ];
    }
    
    /**
     * Assess match quality and confidence based on Ideal Postcodes response
     * 
     * @param array $validated_address Validated address from API
     * @param array $original_address Original address components
     * @return array Assessment result
     */
    public function assessMatchQuality($validated_address, $original_address) {
        $this->addDebug("Assessing match quality using cleanse endpoint data");
        
        // Use cleanse endpoint confidence if available
        $cleanse_confidence = $validated_address['cleanse_confidence'] ?? null;
        $match_analysis = $validated_address['match_analysis'] ?? [];
        
        if ($cleanse_confidence !== null) {
            $this->addDebug("Using cleanse confidence: $cleanse_confidence");
            
            // Determine corrections made based on match analysis
            $corrections_made = [];
            $match_indicators = [];
            
            foreach ($match_analysis as $field => $match_type) {
                if ($match_type === 'INCORRECT' || $match_type === 'PARTIAL') {
                    $field_name = str_replace('_match', '', $field);
                    $corrections_made[] = $field_name;
                    $match_indicators[] = $field . '_' . strtolower($match_type);
                } elseif ($match_type === 'FULL') {
                    $match_indicators[] = $field . '_full';
                }
            }
            
            // Use cleanse confidence as base score
            $confidence_score = $cleanse_confidence;
            
            // Determine match level based on cleanse confidence
            $match_level = $this->determineMatchLevel($confidence_score);
            
            $this->addDebug("Cleanse assessment - Score: $confidence_score, Level: $match_level, Corrections: " . implode(', ', $corrections_made));
            
            return [
                'confidence_score' => round($confidence_score, 3), // Keep more precision from cleanse
                'match_level' => $match_level,
                'corrections_made' => array_unique($corrections_made),
                'match_indicators' => $match_indicators,
                'cleanse_fit' => $validated_address['cleanse_fit'] ?? null,
                'match_analysis' => $match_analysis
            ];
        }
        
        // Fallback to original assessment method if cleanse data not available
        $this->addDebug("Cleanse data not available, using fallback assessment");
        
        $confidence_score = 0.0;
        $corrections_made = [];
        $match_indicators = [];
        
        // Check postcode match (highest weight)
        if (!empty($original_address['postcode']) && !empty($validated_address['postcode'])) {
            $original_pc = strtoupper(str_replace(' ', '', $original_address['postcode']));
            $validated_pc = strtoupper(str_replace(' ', '', $validated_address['postcode']));
            
            if ($original_pc === $validated_pc) {
                $confidence_score += 0.4; // 40% for exact postcode match
                $match_indicators[] = 'postcode_exact';
            } elseif (substr($original_pc, 0, -3) === substr($validated_pc, 0, -3)) {
                $confidence_score += 0.2; // 20% for postcode area match
                $match_indicators[] = 'postcode_area';
                $corrections_made[] = 'postcode';
            } else {
                $match_indicators[] = 'postcode_mismatch';
                $corrections_made[] = 'postcode';
            }
        }
        
        // Check thoroughfare/street match (medium weight)
        $original_street = strtolower(trim($original_address['line_1'] ?? ''));
        $validated_street = strtolower(trim($validated_address['thoroughfare'] ?? $validated_address['line_1'] ?? ''));
        
        if (!empty($original_street) && !empty($validated_street)) {
            $street_similarity = $this->calculateStringSimilarity($original_street, $validated_street);
            
            if ($street_similarity >= 0.9) {
                $confidence_score += 0.3; // 30% for high street similarity
                $match_indicators[] = 'street_high_match';
            } elseif ($street_similarity >= 0.7) {
                $confidence_score += 0.2; // 20% for medium street similarity
                $match_indicators[] = 'street_medium_match';
                $corrections_made[] = 'street';
            } elseif ($street_similarity >= 0.5) {
                $confidence_score += 0.1; // 10% for low street similarity
                $match_indicators[] = 'street_low_match';
                $corrections_made[] = 'street';
            } else {
                $match_indicators[] = 'street_mismatch';
                $corrections_made[] = 'street';
            }
        }
        
        // Cap confidence score at 1.0
        $confidence_score = min($confidence_score, 1.0);
        
        // Determine match level based on confidence score
        $match_level = $this->determineMatchLevel($confidence_score);
        
        $this->addDebug("Fallback assessment - Score: $confidence_score, Level: $match_level, Corrections: " . implode(', ', $corrections_made));
        
        return [
            'confidence_score' => round($confidence_score, 2),
            'match_level' => $match_level,
            'corrections_made' => array_unique($corrections_made),
            'match_indicators' => $match_indicators
        ];
    }
    
    /**
     * Calculate string similarity using Levenshtein distance
     * 
     * @param string $str1 First string
     * @param string $str2 Second string
     * @return float Similarity score (0.0 to 1.0)
     */
    private function calculateStringSimilarity($str1, $str2) {
        if (empty($str1) || empty($str2)) {
            return 0.0;
        }
        
        $str1 = strtolower(trim($str1));
        $str2 = strtolower(trim($str2));
        
        if ($str1 === $str2) {
            return 1.0;
        }
        
        $max_len = max(strlen($str1), strlen($str2));
        if ($max_len === 0) {
            return 1.0;
        }
        
        $distance = levenshtein($str1, $str2);
        return 1.0 - ($distance / $max_len);
    }
    
    /**
     * Extract building number from address line
     * 
     * @param string $address_line Address line
     * @return string Building number or empty string
     */
    private function extractBuildingNumber($address_line) {
        if (empty($address_line)) {
            return '';
        }
        
        // Match building numbers at the start of the address
        if (preg_match('/^(\d+[a-zA-Z]?)\s/', trim($address_line), $matches)) {
            return $matches[1];
        }
        
        return '';
    }
    
    /**
     * Determine match level based on confidence score
     * 
     * @param float $confidence_score Confidence score
     * @return string Match level
     */
    private function determineMatchLevel($confidence_score) {
        if ($confidence_score >= $this->confidence_thresholds['high']) {
            return 'high';
        } elseif ($confidence_score >= $this->confidence_thresholds['medium']) {
            return 'medium';
        } elseif ($confidence_score >= $this->confidence_thresholds['low']) {
            return 'low';
        } else {
            return 'very_low';
        }
    }
    
    /**
     * Get API base URL for external access
     * 
     * @return string API base URL
     */
    public function getApiBaseUrl() {
        return $this->api_base_url;
    }
    
    /**
     * Get API key for external access
     * 
     * @return string API key
     */
    public function getApiKey() {
        return $this->api_key;
    }
    
    /**
     * Check if validation requires manual review
     * 
     * @param float $confidence_score Confidence score
     * @param array $corrections_made List of corrections made
     * @return bool True if manual review required
     */
    public function requiresManualReview($confidence_score, $corrections_made = []) {
        // Require manual review for low confidence scores
        if ($confidence_score < $this->confidence_thresholds['low']) {
            return true;
        }
        
        // Require manual review if postcode was corrected
        if (in_array('postcode', $corrections_made)) {
            return true;
        }
        
        // Require manual review if multiple significant corrections were made
        $significant_corrections = array_intersect($corrections_made, ['street', 'town', 'building_number']);
        if (count($significant_corrections) >= 2) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Format validated address for DPD booking requirements
     * 
     * @param array $validated_address Validated address from API
     * @param array $original_data Original customer data (name, phone, email)
     * @return array DPD-formatted address data
     */
    public function formatForDPD($validated_address, $original_data = []) {
        $this->addDebug("Formatting address for DPD booking");
        
        // Build address lines according to DPD requirements
        $address_lines = $this->buildDPDAddressLines($validated_address);
        
        // Format postcode according to UK standards
        $formatted_postcode = $this->formatUKPostcode($validated_address['postcode'] ?? '');
        
        // Prepare DPD address data
        $dpd_address = [
            'first_name' => $original_data['first_name'] ?? '',
            'last_name' => $original_data['last_name'] ?? '',
            'phone' => $original_data['phone'] ?? '',
            'email' => $original_data['email'] ?? '',
            'street' => $address_lines['street'],
            'street_2' => $address_lines['street_2'],
            'city' => $validated_address['post_town'] ?? $validated_address['town'] ?? '',
            'postal_code' => $formatted_postcode,
            'country' => 'GB'
        ];
        
        // Validate required DPD fields
        $validation_result = $this->validateDPDRequiredFields($dpd_address);
        
        if (!$validation_result['success']) {
            return $validation_result;
        }
        
        $this->addDebug("DPD address formatting completed successfully");
        
        return [
            'success' => true,
            'dpd_address' => $dpd_address,
            'validated_components' => [
                'building_number' => $validated_address['building_number'] ?? '',
                'thoroughfare' => $validated_address['thoroughfare'] ?? '',
                'line_1' => $validated_address['line_1'] ?? '',
                'line_2' => $validated_address['line_2'] ?? '',
                'line_3' => $validated_address['line_3'] ?? '',
                'post_town' => $validated_address['post_town'] ?? '',
                'county' => $validated_address['county'] ?? '',
                'postcode' => $formatted_postcode
            ]
        ];
    }
    
    /**
     * Build DPD address lines from validated address components
     * 
     * @param array $validated_address Validated address components
     * @return array Address lines for DPD
     */
    private function buildDPDAddressLines($validated_address) {
        $this->addDebug("Building DPD address lines from: " . json_encode($validated_address));
        
        $street = '';
        $street_2 = '';
        
        // Handle different address structures intelligently
        if (!empty($validated_address['line_1']) && !empty($validated_address['line_2'])) {
            // Standard case: use line_1 and line_2 directly
            $street = trim($validated_address['line_1']);
            $street_2 = trim($validated_address['line_2']);
            
            // If line_3 exists and street_2 is short, try to include it
            if (!empty($validated_address['line_3']) && strlen($street_2) < 25) {
                $combined_street_2 = trim($street_2 . ', ' . $validated_address['line_3']);
                if (strlen($combined_street_2) <= 35) {
                    $street_2 = $combined_street_2;
                }
            }
            
        } elseif (!empty($validated_address['line_1'])) {
            // Only line_1 available - try to split intelligently
            $line_1 = trim($validated_address['line_1']);
            
            // If line_1 is very long, try to split it
            if (strlen($line_1) > 35) {
                $parts = explode(',', $line_1, 2);
                if (count($parts) === 2) {
                    $street = trim($parts[0]);
                    $street_2 = trim($parts[1]);
                } else {
                    // Try splitting on common patterns
                    if (preg_match('/^(.+?)\s+(Flat|Unit|Apartment|Apt)\s+(.+)$/i', $line_1, $matches)) {
                        $street = trim($matches[2] . ' ' . $matches[3]); // "Flat 4"
                        $street_2 = trim($matches[1]); // Building/street name
                    } else {
                        $street = $this->truncateAddressLine($line_1, 35);
                    }
                }
            } else {
                $street = $line_1;
            }
            
            // Add line_2 and line_3 if available and space permits
            if (!empty($validated_address['line_2']) && strlen($street_2) < 25) {
                $additional = trim($validated_address['line_2']);
                if (!empty($validated_address['line_3'])) {
                    $additional .= ', ' . trim($validated_address['line_3']);
                }
                $street_2 = $this->truncateAddressLine($additional, 35);
            }
            
        } else {
            // Fallback: build from components
            $address_parts = [];
            
            // Building information
            if (!empty($validated_address['building_name'])) {
                $address_parts[] = $validated_address['building_name'];
            } elseif (!empty($validated_address['building_number'])) {
                $address_parts[] = $validated_address['building_number'];
            }
            
            // Sub-building (flat, unit, etc.)
            if (!empty($validated_address['sub_building_name'])) {
                $address_parts[] = $validated_address['sub_building_name'];
            }
            
            $street = implode(', ', $address_parts);
            
            // Thoroughfare goes to street_2
            if (!empty($validated_address['thoroughfare'])) {
                $street_2 = $validated_address['thoroughfare'];
            }
            
            // If we have dependant_thoroughfare, add it
            if (!empty($validated_address['dependant_thoroughfare'])) {
                if (!empty($street_2)) {
                    $street_2 = $validated_address['dependant_thoroughfare'] . ', ' . $street_2;
                } else {
                    $street_2 = $validated_address['dependant_thoroughfare'];
                }
            }
        }
        
        // Handle fallback addresses (when validation failed)
        if (empty($street) && isset($validated_address['fallback_used'])) {
            $this->addDebug("Using fallback address formatting");
            $street = $validated_address['line_1'] ?: $validated_address['thoroughfare'] ?: '';
            $street_2 = $validated_address['line_2'] ?: '';
        }
        
        // Ensure street lines don't exceed DPD limits and are not empty
        $street = $this->truncateAddressLine($street, 35);
        $street_2 = $this->truncateAddressLine($street_2, 35);
        
        // If street is still empty, use thoroughfare as last resort
        if (empty($street) && !empty($validated_address['thoroughfare'])) {
            $street = $this->truncateAddressLine($validated_address['thoroughfare'], 35);
        }
        
        $this->addDebug("DPD address lines built - Street: '$street', Street2: '$street_2'");
        
        return [
            'street' => $street,
            'street_2' => $street_2
        ];
    }
    
    /**
     * Format UK postcode according to standard format
     * 
     * @param string $postcode Raw postcode
     * @return string Formatted postcode
     */
    private function formatUKPostcode($postcode) {
        if (empty($postcode)) {
            return '';
        }
        
        // Remove all spaces and convert to uppercase
        $postcode = strtoupper(str_replace(' ', '', $postcode));
        
        // Validate UK postcode format
        if (!preg_match('/^[A-Z]{1,2}[0-9R][0-9A-Z]?[0-9][ABD-HJLNP-UW-Z]{2}$/', $postcode)) {
            $this->addDebug("Invalid UK postcode format: $postcode");
            return $postcode; // Return as-is if invalid format
        }
        
        // Insert space before last 3 characters
        $formatted = substr($postcode, 0, -3) . ' ' . substr($postcode, -3);
        
        return $formatted;
    }
    
    /**
     * Truncate address line to specified length while preserving words
     * 
     * @param string $address_line Address line
     * @param int $max_length Maximum length
     * @return string Truncated address line
     */
    private function truncateAddressLine($address_line, $max_length) {
        $address_line = trim($address_line);
        
        if (strlen($address_line) <= $max_length) {
            return $address_line;
        }
        
        // Try to truncate at word boundary
        $truncated = substr($address_line, 0, $max_length);
        $last_space = strrpos($truncated, ' ');
        
        if ($last_space !== false && $last_space > ($max_length * 0.7)) {
            // Truncate at word boundary if it's not too short
            return substr($truncated, 0, $last_space);
        }
        
        // Hard truncate if no good word boundary found
        return substr($address_line, 0, $max_length - 3) . '...';
    }
    
    /**
     * Validate required fields for DPD booking
     * 
     * @param array $dpd_address DPD address data
     * @return array Validation result
     */
    private function validateDPDRequiredFields($dpd_address) {
        $required_fields = [
            'first_name' => 'First name',
            'last_name' => 'Last name',
            'street' => 'Street address',
            'city' => 'City',
            'postal_code' => 'Postal code'
        ];
        
        $missing_fields = [];
        
        foreach ($required_fields as $field => $label) {
            if (empty($dpd_address[$field])) {
                $missing_fields[] = $label;
            }
        }
        
        if (!empty($missing_fields)) {
            return [
                'success' => false,
                'error_type' => 'validation_failed',
                'message' => 'Missing required fields for DPD booking',
                'details' => 'Missing fields: ' . implode(', ', $missing_fields)
            ];
        }
        
        // Validate postcode format
        if (!empty($dpd_address['postal_code'])) {
            $postcode_check = str_replace(' ', '', strtoupper($dpd_address['postal_code']));
            if (!preg_match('/^[A-Z]{1,2}[0-9R][0-9A-Z]?[0-9][ABD-HJLNP-UW-Z]{2}$/', $postcode_check)) {
                return [
                    'success' => false,
                    'error_type' => 'validation_failed',
                    'message' => 'Invalid UK postcode format',
                    'details' => 'Postcode must be a valid UK format'
                ];
            }
        }
        
        return ['success' => true];
    }
}

?>