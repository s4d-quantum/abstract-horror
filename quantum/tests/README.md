# Address Validation Integration Test Suite

This directory contains comprehensive tests for the address validation integration feature that validates UK addresses using the Ideal Postcodes API before DPD booking.

## Test Structure

### 1. AddressValidatorTest.php
**Unit tests for the AddressValidator class**

- Tests API communication methods with mock responses
- Validates address parsing and confidence assessment logic  
- Tests error handling for various API failure scenarios
- Uses reflection to test private methods
- **Status: ✅ PASSING (50/50 tests)**

**Key Test Areas:**
- API key validation
- Address query building from components
- Confidence assessment logic
- String similarity calculations
- Building number extraction
- Match level determination
- Manual review requirements
- DPD address formatting
- UK postcode formatting
- Address line truncation
- DPD required fields validation
- Error handling scenarios

### 2. AddressValidationServiceTest.php
**Integration tests for the AddressValidationService class**

- Tests complete validation workflow with database operations
- Validates error handling and response formatting
- Tests integration with existing database and logging systems
- Creates test data and validates database operations
- **Status: ⚠️ REQUIRES DATABASE (tbl_bm2 table)**

**Key Test Areas:**
- Database operations and schema validation
- Address data loading from database
- Existing validation checking
- Validation result storage
- Validated address retrieval for DPD
- Error handling and response formatting
- Validation statistics
- Service integration scenarios

### 3. WorkflowIntegrationTest.php
**End-to-end workflow integration tests**

- Tests complete BackMarket to DPD workflow with address validation
- Validates various address scenarios (valid, invalid, ambiguous)
- Tests error handling and manual review scenarios
- Tests data consistency and workflow reliability
- **Status: ⚠️ REQUIRES DATABASE (tbl_bm2 table)**

**Key Test Areas:**
- Complete workflow scenarios
- Address validation integration
- Error handling scenarios
- Manual review scenarios
- DPD address formatting integration
- Workflow performance and reliability
- Data consistency and integrity

### 4. run_all_tests.php
**Test runner that executes all test suites**

- Runs all three test suites in sequence
- Provides comprehensive reporting
- Includes troubleshooting guidance
- Measures execution time and success rates

## Running the Tests

### Prerequisites

1. **PHP Environment**: PHP 7.4+ with required extensions
2. **Database Access**: MySQL/MariaDB with `tbl_bm2` table (for integration tests)
3. **File Access**: Read access to implementation files in `orders/imei/includes/`

### Running Individual Test Suites

```bash
# Run unit tests only (no database required)
php tests/AddressValidatorTest.php

# Run integration tests (requires database)
php tests/AddressValidationServiceTest.php

# Run end-to-end tests (requires database)
php tests/WorkflowIntegrationTest.php
```

### Running All Tests

```bash
# Run complete test suite
php tests/run_all_tests.php
```

## Test Results Summary

### Current Status
- **Unit Tests**: ✅ 100% PASSING (50/50 tests)
- **Integration Tests**: ⚠️ Requires database setup
- **End-to-End Tests**: ⚠️ Requires database setup

### Test Coverage

The test suite provides comprehensive coverage of:

1. **Core Functionality** (100% covered)
   - Address validation logic
   - API communication
   - Confidence assessment
   - Error handling

2. **Database Integration** (Covered, requires setup)
   - Data loading and storage
   - Schema validation
   - Transaction integrity

3. **Workflow Integration** (Covered, requires setup)
   - End-to-end validation flow
   - Error scenarios
   - Manual review processes

## Database Setup for Integration Tests

To run the full test suite, ensure the following database setup:

### Required Table: `tbl_bm2`

```sql
-- Core columns (should already exist)
CREATE TABLE IF NOT EXISTS tbl_bm2 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bm_order_id VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    street VARCHAR(255),
    street_2 VARCHAR(255),
    city VARCHAR(255),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    price DECIMAL(10,2)
);

-- Validation columns (added by migration)
ALTER TABLE tbl_bm2 ADD COLUMN IF NOT EXISTS v_status INT(11) DEFAULT NULL;
ALTER TABLE tbl_bm2 ADD COLUMN IF NOT EXISTS v_match_level VARCHAR(50) DEFAULT NULL;
ALTER TABLE tbl_bm2 ADD COLUMN IF NOT EXISTS v_confidence_score DECIMAL(3,2) DEFAULT NULL;
-- ... (additional validation columns)
```

### Database Configuration

Ensure `db_config.php` is properly configured with:
- Correct database credentials
- Proper database selection
- Required permissions for CREATE, INSERT, UPDATE, DELETE operations

## Expected Test Behavior

### With Database Access
- All tests should pass or provide meaningful error messages
- Integration tests create and clean up test data automatically
- Database schema is validated and extended as needed

### Without Database Access
- Unit tests pass completely (no database required)
- Integration tests fail gracefully with clear error messages
- Test runner provides guidance for database setup

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `db_config.php` configuration
   - Check database server availability
   - Ensure proper credentials and permissions

2. **Missing Table Errors**
   - Ensure `tbl_bm2` table exists
   - Run database migration if needed
   - Check table permissions

3. **API Configuration Warnings**
   - Tests expect API calls to fail without real credentials
   - This is normal behavior for testing environment
   - Tests validate error handling, not successful API calls

### Test Environment Notes

- Tests use mock data and don't require real API credentials
- Database tests create temporary test data with unique identifiers
- All test data is automatically cleaned up after test execution
- Tests are designed to be safe for development environments

## Production Deployment Checklist

After tests pass, ensure the following for production:

1. ✅ Configure `IDEAL_POSTCODES_API_KEY` environment variable
2. ✅ Run database migration to add validation columns
3. ✅ Update `book_dpd_and_update_bm.php` to include validation step
4. ✅ Set up monitoring for validation success rates
5. ✅ Configure error logging and alerting
6. ✅ Test with real API credentials in staging environment

## Test Maintenance

### Adding New Tests

1. Follow existing test patterns and naming conventions
2. Use reflection to test private methods when necessary
3. Include both positive and negative test cases
4. Add cleanup code for any test data created
5. Update this README with new test descriptions

### Updating Tests

When modifying the implementation:
1. Update corresponding tests to match new behavior
2. Ensure test coverage remains comprehensive
3. Verify all tests still pass after changes
4. Update test documentation as needed

## Support

For issues with the test suite:
1. Check the troubleshooting section above
2. Verify database and environment setup
3. Review test output for specific error messages
4. Ensure all implementation files are present and accessible