<?php
/**
 * Forms Offline — Single-File PHP E2EE Collector Addon
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-PoW-Nonce, X-PoW-Solution');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$storageDir = __DIR__ . '/submissions/';
if (!file_exists($storageDir)) {
    mkdir($storageDir, 0755, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_SERVER['REQUEST_URI'] === '/challenge') {
    $nonce = bin2hex(random_bytes(16));
    echo json_encode([
        'nonce' => $nonce,
        'difficulty' => '0000',
        'timestamp' => time()
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nonce = $_SERVER['HTTP_X_POW_NONCE'] ?? '';
    $solution = $_SERVER['HTTP_X_POW_SOLUTION'] ?? '';

    $hash = hash('sha256', $nonce . $solution);
    if (strpos($hash, '0000') !== 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid Proof-of-Work solution.']);
        exit;
    }

    $rawInput = file_get_contents('php://input');
    if (strlen($rawInput) > 500 * 1024) {
        http_response_code(413);
        echo json_encode(['error' => 'Payload size exceeds 500KB cap.']);
        exit;
    }

    $filename = $storageDir . 'sub_' . time() . '_' . bin2hex(random_bytes(4)) . '.json';
    file_put_contents($filename, $rawInput);

    echo json_encode(['success' => true, 'message' => 'Record stored securely.']);
    exit;
}
