<?php

require __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;

// Load environment variables
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();

function sendEmailWithAttachment($subject, $body, $xlsContent, $filename)
{
    $smtpDsn = $_ENV['MAILER_DSN'] ?? $_SERVER['MAILER_DSN'] ?? getenv('MAILER_DSN');
    if (!$smtpDsn) {
        error_log('MAILER_DSN is not configured.');
        echo "Email service is not configured. Please contact an administrator.";
        return;
    }

    // Create Mailer instance
    $transport = Transport::fromDsn($smtpDsn);
    $mailer = new Mailer($transport);

    // Build the email
    $email = (new Email())
        ->from('warehouse@quantum-cloud.co.uk')
        ->to($_SESSION['user_email'])
        ->addTo('warehouse@s4dltd.com')
        ->replyTo('warehouse@quantum-cloud.co.uk')
        ->subject($subject)
        ->html($body)
        ->text('This is the body in plain text for non-HTML mail clients')
        ->attach($xlsContent, $filename, 'application/vnd.ms-excel');

    // Try sending
    try {
        $mailer->send($email);
        // Don't redirect, just continue with the page rendering
    } catch (Exception $e) {
        error_log("Symfony Mailer error: " . $e->getMessage());
        echo "An error occurred while sending the email. Please try again later.";
    }
}

