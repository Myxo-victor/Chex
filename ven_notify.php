<?php
/**
 * @author Myxo victor
 * VenJS v5.10.0 Notification Handler
 * Receives device subscription data from VenJS and stores it for server-side push notifications.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (isset($data['deviceId']) && !empty($data['deviceId'])) {
        $deviceId  = htmlspecialchars($data['deviceId']);
        $type      = isset($data['type']) ? htmlspecialchars($data['type']) : 'unknown';
        $timestamp = date("Y-m-d H:i:s");
        $ipAddress = $_SERVER['REMOTE_ADDR'];
        $userAgent = $_SERVER['HTTP_USER_AGENT'];

        $logEntry = "------------------------------------------------" . PHP_EOL;
        $logEntry .= "Date: $timestamp" . PHP_EOL;
        $logEntry .= "Device ID: $deviceId" . PHP_EOL;
        $logEntry .= "Type: $type" . PHP_EOL;
        $logEntry .= "IP: $ipAddress" . PHP_EOL;
        $logEntry .= "User Agent: $userAgent" . PHP_EOL;

        $filePath = 'notification_handler.txt';

        if (file_put_contents($filePath, $logEntry, FILE_APPEND | LOCK_EX)) {
            echo json_encode([
                "status" => "success",
                "code" => 200,
                "message" => "Device successfully registered to the VenJS 5.0 ecosystem."
            ]);
        } else {
            http_response_code(500);
            echo json_encode([
                "status" => "error",
                "code" => 500,
                "message" => "Failed to write to notification_handler.txt. Check folder permissions."
            ]);
        }
    } else {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "code" => 400,
            "message" => "Invalid payload. 'deviceId' is required."
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "code" => 405,
        "message" => "Method Not Allowed. Use POST via VenJS 5.0 notification APIs."
    ]);
}
?>
