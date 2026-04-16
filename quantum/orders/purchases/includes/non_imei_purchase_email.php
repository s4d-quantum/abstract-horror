<?php 
include '../../db_config.php';

// fetch email from database
$get_email_query = mysqli_query($conn,"select * from tbl_settings")
    or die('error: '.mysqli_error($conn));
    $get_email = mysqli_fetch_assoc($get_email_query)['email'];

    $name = "S4D Limited";
    $email = 'admin@s4dlimited.com';

    $message = '<h2 style="padding:10px; text-align:center; background:#8ba2bf; color:#ffffff;">Non IMEI Goods In Report</h2>';
    $message .= '<p style="margin:5px;"> Purchase ID: <b>'.$_POST['purchase_id'].'</b></p>';
    $message .= '<p style="margin:5px;">Date: <b>'.$_POST['date'].'</b></p>';
    $message .= '<p style="margin:5px;">Supplier: <b>'.$_POST['supplier'].'</b></p>';
    $message .= '<table cellpadding="10" style="margin:10px 0; width:100%;" border="1">';
    $message .= '<thead style="background:#cbd6e4"><th>Item Code</th><th>Brand</th><th>Details</th><th>Qty</th></thead>';
    $message .= '<tbody style=" border:3px solid #cccccc;">';
    $message .= $_POST['message'];
    $message .= '</tbody></table>';

    // $formcontent=" From: $name \n Email: $email \n Message: $message";
    // $recipient = 'ahmed.gmurtaza@hotmail.com, ahmed.gmurtaza@gmail.com'; //multiple recipients
    $recipient = $get_email;
    $subject = "S4DLimited GoodsIn Report";

    // Always set content-type when sending HTML email
    $mailheader .= "MIME-Version: 1.0" . "\r\n";
    $mailheader .= "Content-Type: text/html; charset=ISO-8859-1\r\n";
    $mailheader .= "From: $email \r\n";

    mail($recipient, $subject, $message, $mailheader) 
    or die("Error!");

    echo "Thank You!";

// echo $_POST['message'];
