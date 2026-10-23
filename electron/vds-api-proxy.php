<?php
/**
 * IIS → Node VDS API (127.0.0.1:8787). ARR / cURL gerekmez.
 */
declare(strict_types=1);

$target = 'http://127.0.0.1:8787';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$path = preg_replace('#^/vds-api#', '', $uri) ?: '/';
if ($path === '' || $path[0] !== '/') {
    $path = '/' . $path;
}
$url = $target . $path;
if (!empty($_SERVER['QUERY_STRING'])) {
    $url .= '?' . $_SERVER['QUERY_STRING'];
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');
$headerLines = [];
foreach (getallheaders() ?: [] as $name => $value) {
    $lname = strtolower((string) $name);
    if (in_array($lname, ['host', 'content-length', 'connection', 'accept-encoding'], true)) {
        continue;
    }
    $headerLines[] = $name . ': ' . $value;
}
$headerLines[] = 'Connection: close';

$opts = [
    'http' => [
        'method' => $method,
        'header' => implode("\r\n", $headerLines),
        'content' => ($body === false) ? '' : $body,
        'ignore_errors' => true,
        'timeout' => 60,
    ],
];
$raw = @file_get_contents($url, false, stream_context_create($opts));
$respHeaders = $http_response_header ?? [];
$status = 502;
if ($respHeaders) {
    if (preg_match('#HTTP/\S+\s+(\d+)#', $respHeaders[0], $m)) {
        $status = (int) $m[1];
    }
}
if ($raw === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'VDS API kapalı']);
    exit;
}
http_response_code($status);
foreach ($respHeaders as $i => $line) {
    if ($i === 0) continue;
    if (stripos($line, 'Transfer-Encoding:') === 0) continue;
    if (stripos($line, 'Connection:') === 0) continue;
    header($line, false);
}
echo $raw;
