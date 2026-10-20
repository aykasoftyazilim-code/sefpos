<?php
/**
 * IIS: yalnızca /s1/{VKN} → http://127.0.0.1:8786/s1/...
 * 8787 (ŞefPOS garson / vds-api), 9090 (yerel Cloud Link), 8788 kullanılmaz.
 */
header_remove('X-Powered-By');

$path = isset($_GET['p']) ? (string) $_GET['p'] : '';
if ($path === '') {
    $uri = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/', PHP_URL_PATH);
    if (preg_match('#/s1(/.*)?$#', (string) $uri, $m)) {
        $path = isset($m[1]) ? $m[1] : '';
    }
}
$path = '/' . ltrim(str_replace('\\', '/', $path), '/');
if ($path === '/') {
    $path = '';
}

$qs = isset($_SERVER['QUERY_STRING']) ? (string) $_SERVER['QUERY_STRING'] : '';
$qs = preg_replace('/(?:^|&)p=[^&]*/', '', $qs);
$qs = ltrim((string) $qs, '&');

$target = 'http://127.0.0.1:8786/s1' . $path;
if ($qs !== '') {
    $target .= '?' . $qs;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$body = null;
if ($method !== 'GET' && $method !== 'HEAD') {
    $body = file_get_contents('php://input');
}

$hdrs = array();
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) {
        $lk = strtolower($k);
        if ($lk === 'host' || $lk === 'content-length' || $lk === 'connection') {
            continue;
        }
        $hdrs[] = $k . ': ' . $v;
    }
}
$hdrs[] = 'X-Forwarded-Proto: https';
$hdrs[] = 'X-Forwarded-Host: sefpos.com.tr';

$ch = curl_init($target);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);
curl_setopt($ch, CURLOPT_HTTPHEADER, $hdrs);
if ($body !== null && $body !== '') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}
$raw = curl_exec($ch);
if ($raw === false) {
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array(
        'ok' => false,
        'message' => 'VDS Node 8786 erisilemedi: ' . curl_error($ch),
    ));
    curl_close($ch);
    exit;
}
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$hsz = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

$respHeaders = substr($raw, 0, $hsz);
$respBody = substr($raw, $hsz);
http_response_code($code ? $code : 200);
foreach (preg_split("/\r\n|\n|\r/", $respHeaders) as $line) {
    if (strpos($line, ':') === false) {
        continue;
    }
    $lk = strtolower(trim(strtok($line, ':')));
    if ($lk === 'transfer-encoding' || $lk === 'connection' || $lk === 'keep-alive') {
        continue;
    }
    header($line, false);
}
echo $respBody;
