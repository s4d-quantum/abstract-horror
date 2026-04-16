<?php
/**
 * CSRF Protection Helper
 * Include this file in forms that need CSRF protection
 */

/**
 * Generate a CSRF token and store it in session
 */
function generate_csrf_token() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token from POST request
 * @return bool True if valid, false otherwise
 */
function validate_csrf_token() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (!isset($_POST['csrf_token']) || !isset($_SESSION['csrf_token'])) {
        return false;
    }

    // Use hash_equals to prevent timing attacks
    return hash_equals($_SESSION['csrf_token'], $_POST['csrf_token']);
}

/**
 * Output hidden CSRF token field for forms
 */
function csrf_token_field() {
    $token = generate_csrf_token();
    echo '<input type="hidden" name="csrf_token" value="' . htmlspecialchars($token, ENT_QUOTES, 'UTF-8') . '">';
}
?>
