<?php include '../../db_config.php';  ?>
<?php include "../../authenticate.php" ?>
<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $tray_id = mysqli_real_escape_string($conn, $_POST['tray_id'] ?? '');
    $locked = isset($_POST['locked']) ? intval($_POST['locked']) : 0;
    $user_id = intval($_SESSION['user_id']);
    $note = isset($_POST['lock_note']) ? mysqli_real_escape_string($conn, $_POST['lock_note']) : NULL;

    if ($tray_id !== '') {
        $q = "UPDATE tbl_trays SET locked = $locked, locked_by = $user_id, locked_at = NOW(), lock_note = " .
             (is_null($note) ? "NULL" : "'".$note."'") . " WHERE tray_id = '".$tray_id."'";
        mysqli_query($conn, $q) or die('Error:: '.mysqli_error($conn));

        // Log the action
        $subject = $locked ? 'TRAY LOCKED' : 'TRAY UNLOCKED';
        $date = date('Y-m-d');
        mysqli_query($conn, "insert into tbl_log (ref, subject, details, date, user_id) values (
            '".$tray_id."',
            '".$subject."',
            '".$tray_id."',
            '".$date."',
            '".$user_id."'
        )") or die('Error:: '.mysqli_error($conn));
    }
}

header('Location: manage_locations.php');
exit;

