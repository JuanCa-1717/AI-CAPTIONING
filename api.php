<?php
header('Content-Type: application/json');

// Tu clave API de OpenRouter aquí (oculta en el servidor)
$api_key = '***REMOVED***'; // Reemplaza con tu clave real si es diferente

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (isset($input['messages']) && is_array($input['messages'])) {
        $data = [
            'model' => 'nvidia/nemotron-nano-12b-v2-vl:free',
            'messages' => $input['messages']
        ];

        $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $api_key,
            'Content-Type: application/json',
            'HTTP-Referer: ' . ($_SERVER['HTTP_REFERER'] ?? ''),
            'X-Title: AIWORK'
        ]);

        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        http_response_code($http_code);
        echo $response;
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Entrada inválida: se requieren mensajes']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
}
?></content>
<parameter name="filePath">c:\Users\Juan Carlos\OneDrive\Documentos\AI-CAPTIONING\api.php