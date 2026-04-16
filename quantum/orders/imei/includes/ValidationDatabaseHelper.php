<?php
/**
 * ValidationDatabaseHelper.php
 * Database helper functions for address validation operations
 * Requirements: 4.4
 */

class ValidationDatabaseHelper {
    private $mysqli;
    
    public function __construct($mysqli_connection = null) {
        if ($mysqli_connection) {
            $this->mysqli = $mysqli_connection;
        } else {
            $this->initializeConnection();
        }
    }
    
    /**
     * Initialize database connection using environment variables
     * Following existing patterns from db_config.php
     */
    private function initializeConnection() {
        // Load environment variables if not already loaded
        if (!isset($_ENV['DB_HOST'])) {
            require_once __DIR__ . '/../../../vendor/autoload.php';
            $dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../../');
            $dotenv->safeLoad();
        }
        
        $host = $_ENV['DB_HOST'];
        $username = $_ENV['DB_USERNAME'];
        $password = $_ENV['DB_PASSWORD'];
        $database = $_ENV['DB_DATABASE'];
        $port = $_ENV['DB_PORT'] ?? 3306;
        
        $this->mysqli = new mysqli($host, $username, $password, $database, $port);
        
        if ($this->mysqli->connect_errno) {
            throw new Exception("Database connection failed: " . $this->mysqli->connect_error);
        }
        
        // Set charset to match existing pattern
        $this->mysqli->set_charset("utf8mb4");
    }
    
    /**
     * Check if validation columns exist in tbl_bm2 table
     * Prevents duplicate migration errors
     * 
     * @return array Array of missing columns
     */
    public function checkValidationColumns() {
        $required_columns = [
            'v_match_level',
            'v_confidence_score', 
            'v_api_response',
            'v_validated_at'
        ];
        
        $existing_columns = [];
        $result = $this->mysqli->query("SHOW COLUMNS FROM tbl_bm2 LIKE 'v_%'");
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $existing_columns[] = $row['Field'];
            }
        }
        
        return array_diff($required_columns, $existing_columns);
    }
    
    /**
     * Safely add validation columns to tbl_bm2 table
     * Only adds columns that don't already exist
     * 
     * @return bool Success status
     */
    public function addValidationColumns() {
        $missing_columns = $this->checkValidationColumns();
        
        if (empty($missing_columns)) {
            return true; // All columns already exist
        }
        
        $alterStatements = [];
        
        foreach ($missing_columns as $column) {
            switch ($column) {
                case 'v_match_level':
                    $alterStatements[] = "ADD COLUMN `v_match_level` VARCHAR(50) DEFAULT NULL COMMENT 'Match level from Ideal Postcodes API'";
                    break;
                case 'v_confidence_score':
                    $alterStatements[] = "ADD COLUMN `v_confidence_score` DECIMAL(3,2) DEFAULT NULL COMMENT 'Validation confidence score 0.00-1.00'";
                    break;
                case 'v_api_response':
                    $alterStatements[] = "ADD COLUMN `v_api_response` TEXT DEFAULT NULL COMMENT 'Full API response for debugging'";
                    break;
                case 'v_validated_at':
                    $alterStatements[] = "ADD COLUMN `v_validated_at` TIMESTAMP DEFAULT NULL COMMENT 'When validation was performed'";
                    break;
            }
        }
        
        if (!empty($alterStatements)) {
            $sql = "ALTER TABLE `tbl_bm2` " . implode(', ', $alterStatements);
            
            if (!$this->mysqli->query($sql)) {
                throw new Exception("Failed to add validation columns: " . $this->mysqli->error);
            }
        }
        
        return true;
    }
    
    /**
     * Add indexes for validation columns if they don't exist
     * 
     * @return bool Success status
     */
    public function addValidationIndexes() {
        $indexes = [
            'idx_tbl_bm2_v_status' => 'CREATE INDEX IF NOT EXISTS `idx_tbl_bm2_v_status` ON `tbl_bm2` (`v_status`)',
            'idx_tbl_bm2_v_validated_at' => 'CREATE INDEX IF NOT EXISTS `idx_tbl_bm2_v_validated_at` ON `tbl_bm2` (`v_validated_at`)',
            'idx_tbl_bm2_validation_quality' => 'CREATE INDEX IF NOT EXISTS `idx_tbl_bm2_validation_quality` ON `tbl_bm2` (`v_status`, `v_confidence_score`)'
        ];
        
        foreach ($indexes as $indexName => $sql) {
            if (!$this->mysqli->query($sql)) {
                // Note: MySQL doesn't support IF NOT EXISTS for indexes in all versions
                // So we'll check if the error is about duplicate key name
                if (strpos($this->mysqli->error, 'Duplicate key name') === false) {
                    throw new Exception("Failed to create index $indexName: " . $this->mysqli->error);
                }
            }
        }
        
        return true;
    }
    
    /**
     * Update v_status column comment to include status codes
     * 
     * @return bool Success status
     */
    public function updateStatusColumnComment() {
        $sql = "ALTER TABLE `tbl_bm2` MODIFY COLUMN `v_status` INT(11) DEFAULT NULL COMMENT 'Validation status: 0=not validated, 1=validated, 2=failed, 3=manual_review_required'";
        
        if (!$this->mysqli->query($sql)) {
            throw new Exception("Failed to update v_status column comment: " . $this->mysqli->error);
        }
        
        return true;
    }
    
    /**
     * Run complete database schema migration for validation
     * Combines all migration steps with error handling
     * 
     * @return array Migration results
     */
    public function runValidationMigration() {
        $results = [
            'success' => true,
            'steps_completed' => [],
            'errors' => []
        ];
        
        try {
            // Step 1: Add validation columns
            $this->addValidationColumns();
            $results['steps_completed'][] = 'Added validation columns';
            
            // Step 2: Add indexes
            $this->addValidationIndexes();
            $results['steps_completed'][] = 'Added validation indexes';
            
            // Step 3: Update status column comment
            $this->updateStatusColumnComment();
            $results['steps_completed'][] = 'Updated status column comment';
            
        } catch (Exception $e) {
            $results['success'] = false;
            $results['errors'][] = $e->getMessage();
        }
        
        return $results;
    }
    
    /**
     * Verify migration completed successfully
     * 
     * @return array Verification results
     */
    public function verifyMigration() {
        $verification = [
            'columns_exist' => [],
            'indexes_exist' => [],
            'missing_columns' => [],
            'success' => true
        ];
        
        // Check columns
        $result = $this->mysqli->query("
            SELECT 
                COLUMN_NAME, 
                DATA_TYPE, 
                IS_NULLABLE, 
                COLUMN_DEFAULT, 
                COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'tbl_bm2' 
                AND COLUMN_NAME LIKE 'v_%'
            ORDER BY COLUMN_NAME
        ");
        
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $verification['columns_exist'][] = $row;
            }
        }
        
        // Check for missing columns
        $verification['missing_columns'] = $this->checkValidationColumns();
        
        if (!empty($verification['missing_columns'])) {
            $verification['success'] = false;
        }
        
        return $verification;
    }
    
    /**
     * Get database connection for external use
     * 
     * @return mysqli Database connection
     */
    public function getConnection() {
        return $this->mysqli;
    }
    
    /**
     * Close database connection
     */
    public function close() {
        if ($this->mysqli) {
            $this->mysqli->close();
        }
    }
}