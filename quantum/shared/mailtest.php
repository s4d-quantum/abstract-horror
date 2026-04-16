<?php
// test_mail.php
require __DIR__ . '/../vendor/autoload.php';

use Symfony\Component\Mailer\Transport;
use Symfony\Component\Mailer\Mailer;
use Symfony\Component\Mime\Email;

// 1. Manually define your DSN here for the test to rule out .env issues
// Format: smtp://USERNAME:PASSWORD@smtp.office365.com:587
$testDsn = 'smtp://api:5c20e5d4e58fb8c212fea0cad4bf3c8f@live.smtp.mailtrap.io:2525?encryption=tls'; 

try {
    echo "--- Starting Mailer Test ---\n";
    
    $transport = Transport::fromDsn($testDsn);
    $mailer = new Mailer($transport);

    // Create a fake Excel string
    $fakeXls = "ID,Name,Status\n1,Test,Success";

    $email = (new Email())
        ->from('warehouse@quantum-cloud.co.uk')
        ->to('pcouzens83@gmail.com') // SEND TO YOURSELF TO VERIFY
        ->subject('DEBUG: Backup Contingency Test')
        ->html('<h1>System Test</h1><p>Testing the 9th contingency layer.</p>')
        ->text('Testing the 9th contingency layer.')
        ->attach($fakeXls, 'test_backup.xls', 'application/vnd.ms-excel');

    echo "Attempting to send...\n";
    $mailer->send($email);
    echo "✅ SUCCESS: Email sent without errors.\n";

} catch (\Exception $e) {
    echo "❌ FAILURE: \n";
    echo "Error Message: " . $e->getMessage() . "\n";
    echo "Trace: \n" . $e->getTraceAsString() . "\n";
}
