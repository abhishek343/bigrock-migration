<?php
// 1. HEADERS: Rules of Engagement
// This tells the browser: "I am sending you JSON data, not an HTML page."
header('Content-Type: application/json');

// 2. SECURITY: Load the Secret Key
// We look for a file named 'config.php' that holds the key.
// If it's missing, we kill the script immediately to prevent errors.
if (!file_exists('config.php')) {
    echo json_encode(['error' => 'Server config missing']);
    exit;
}
require_once 'config.php'; // Loads $GEMINI_API_KEY from the secret file

// 3. INPUT: Catch the data from JavaScript
// PHP doesn't automatically read JSON sent to it. We have to fetch the raw input.
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true); // Convert JSON string to PHP Array

// Safety Check: Did the user actually send a prompt?
$userPrompt = $input['prompt'] ?? '';
if (!$userPrompt) {
    echo json_encode(['error' => 'No prompt provided']);
    exit;
}

// 4. THE MESSAGE: Pack the box for Google
$googleURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" . $GEMINI_API_KEY;

$dataToSend = [
    "contents" => [
        [
            "parts" => [
                ["text" => $userPrompt]
            ]
        ]
    ]
];

// 5. THE COURIER: cURL
// cURL is a library that lets PHP act like a browser to visit other websites.
$ch = curl_init($googleURL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // "Don't just output the result, save it to a variable."
curl_setopt($ch, CURLOPT_POST, true);           // "We are POSTing data, not just GETting a page."
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($dataToSend));

// Execute the mission
$response = curl_exec($ch);

// 6. RESPONSE: Check for failures and reply to frontend
if(curl_errno($ch)){
    echo json_encode(['error' => 'Request Error:' . curl_error($ch)]);
} else {
    // Send the raw answer from Google back to your Javascript
    echo $response; 
}

curl_close($ch); // Hang up the phone
?>
