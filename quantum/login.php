<?php

header('X-Frame-Options: SAMEORIGIN');
$global_url = "";

// Include the database configuration file
include 'db_config.php';
include './shared/logout.php';

logout();

// Set the date format
$date = date('Y-m-d');

// Redirect the user to the dashboard if already logged in
if (isset($_SESSION['user_role'])) {
    header("location:index.php");
    exit;
}

// Initialize the error message
$error = '';

// Generate CSRF Token if it doesn't exist
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Handle login form submission
if (isset($_POST['email']) && isset($_POST['password'])) {
    // Validate CSRF Token
    if (
        !isset($_POST['csrf_token']) ||
        !isset($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])
    ) {
        $error = 'Invalid CSRF token. Please try again.';
    } else {
        $email = trim($_POST['email']);
        $password = $_POST['password'];

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Invalid credentials. Please try again.';
        } else {
            mysqli_select_db($conn, 's4d_user_accounts');

            $stmt = mysqli_prepare(
                $conn,
                "SELECT user_id, user_name, user_role, user_password, user_db
                 FROM tbl_accounts
                 WHERE user_email = ?
                 LIMIT 1"
            );

            if (!$stmt) {
                $error = 'Login temporarily unavailable. Please try again.';
            } else {
                mysqli_stmt_bind_param($stmt, 's', $email);
                mysqli_stmt_execute($stmt);
                mysqli_stmt_bind_result($stmt, $user_id, $user_name, $user_role, $stored_password, $user_db);

                if (mysqli_stmt_fetch($stmt)) {
                    // Verify the entered password against the stored hashed password
                    if (password_verify($password, $stored_password) && !empty($user_db)) {
                        // Regenerate the session ID to prevent session fixation
                        session_regenerate_id(true);

                        $_SESSION['user_id'] = $user_id;
                        $_SESSION['user_name'] = $user_name;
                        $_SESSION['user_role'] = $user_role;
                        $_SESSION['user_email'] = $email;
                        $_SESSION['user_db'] = $user_db;

                        // Log the user in
                        $date = date('Y-m-d H:i:s');
                        $subject = 'USER LOGIN';
                        $log_stmt = mysqli_prepare(
                            $conn,
                            "INSERT INTO tbl_log (user_id, date, subject) VALUES (?, ?, ?)"
                        );
                        if ($log_stmt) {
                            $user_id_int = (int)$user_id;
                            mysqli_stmt_bind_param($log_stmt, 'iss', $user_id_int, $date, $subject);
                            mysqli_stmt_execute($log_stmt);
                            mysqli_stmt_close($log_stmt);
                        }

                        // Switch DB
                        mysqli_select_db($conn, $user_db);

                        // Redirect the user to the dashboard
                        header("location:index.php");
                        exit;
                    } else {
                        $error = 'Invalid credentials. Please try again.';
                    }
                } else {
                    $error = 'Either Email or Password is wrong! Please try again.';
                }

                mysqli_stmt_close($stmt);
            }
        }
    }
}
?>

<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>S4D Limited</title>
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/bootstrap.min.css">
    <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/font-awesome.min.css">
    <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/ionicons.min.css">
    <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/AdminLTE.min.css">
    <link rel="stylesheet" href="<?php echo $global_url; ?>assets/css/_all-skins.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
</head>

<body class="hold-transition login-page">
    <div class="login-box animate__animated animate__flipInY">
        <div>
            <a style="display:block; text-align:center;" href="../../index2.html"><img src="assets/img/logo.png"
                style="width:150px;margin:0 auto;"></a>
        </div>
        <div class="login-box-body">
            <!-- display error message if any -->
            <?php if (!empty($error)): ?>
            <div class="alert alert-danger"><?php echo $error; ?></div>
            <?php endif; ?>

            <form action="login.php" method="post">
                <div class="form-group has-feedback">
                    <input type="email" class="user_email form-control" placeholder="Email" name="email">
                </div>
                <div class="form-group has-feedback">
                    <input type="password" class="user_password form-control" placeholder="Password" name="password">
                    <a href="forgotpassword.php">Forgot password?</a>
                </div>
                <!-- CSRF Token -->
                <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                
                <div class="row">
                    <div class="col-xs-4">
                        <button type="submit" class="btn btn-primary btn-block btn-flat submit">Sign In</button>
                    </div>
                </div>
            </form>
        </div>
    </div>

    <script src="<?php echo $global_url; ?>assets/dist/bundle.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            var form = document.querySelector('form');
            if (!form) return;
            form.addEventListener('submit', function () {
                localStorage.setItem('userInActive', '0');
            });
        });
    </script>

</body>

</html>
