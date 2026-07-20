param(
  [int]$PreferredPort = 8765,
  [switch]$SelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$configPath = Join-Path $projectRoot "designer-config.js"
$utf8 = New-Object Text.UTF8Encoding($false)
$tokenBytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$random.GetBytes($tokenBytes)
$random.Dispose()
$editorToken = -join ($tokenBytes | ForEach-Object { $_.ToString("x2") })

function Read-HttpRequest {
  param([Net.Sockets.NetworkStream]$Stream)

  $headerBuffer = New-Object IO.MemoryStream
  $terminatorState = 0
  while ($headerBuffer.Length -lt 65536) {
    $nextByte = $Stream.ReadByte()
    if ($nextByte -lt 0) { throw "Connection closed before the request headers completed." }
    $headerBuffer.WriteByte([byte]$nextByte)
    switch ($terminatorState) {
      0 { $terminatorState = if ($nextByte -eq 13) { 1 } else { 0 } }
      1 { $terminatorState = if ($nextByte -eq 10) { 2 } elseif ($nextByte -eq 13) { 1 } else { 0 } }
      2 { $terminatorState = if ($nextByte -eq 13) { 3 } else { 0 } }
      3 {
        if ($nextByte -eq 10) { $terminatorState = 4 }
        else { $terminatorState = 0 }
      }
    }
    if ($terminatorState -eq 4) { break }
  }
  if ($terminatorState -ne 4) { throw "Request headers are too large." }

  $headerText = [Text.Encoding]::ASCII.GetString($headerBuffer.ToArray())
  $lines = $headerText -split "`r`n"
  $requestParts = $lines[0].Split(" ")
  if ($requestParts.Length -lt 2) { throw "Malformed HTTP request line." }
  $headers = @{}
  foreach ($line in $lines[1..($lines.Length - 1)]) {
    $separator = $line.IndexOf(":")
    if ($separator -le 0) { continue }
    $headers[$line.Substring(0, $separator).Trim()] = $line.Substring($separator + 1).Trim()
  }

  $contentLength = 0
  if ($headers.ContainsKey("Content-Length")) {
    if (![int]::TryParse($headers["Content-Length"], [ref]$contentLength) -or $contentLength -lt 0 -or $contentLength -gt 1048576) {
      throw "Invalid request body length."
    }
  }
  $body = New-Object byte[] $contentLength
  $offset = 0
  while ($offset -lt $contentLength) {
    $read = $Stream.Read($body, $offset, $contentLength - $offset)
    if ($read -le 0) { throw "Connection closed before the request body completed." }
    $offset += $read
  }

  return [pscustomobject]@{
    Method = $requestParts[0].ToUpperInvariant()
    Target = $requestParts[1]
    Headers = $headers
    Body = $body
  }
}

function Send-HttpResponse {
  param(
    [Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n"
  $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

function Send-TextResponse {
  param(
    [Net.Sockets.NetworkStream]$Stream,
    [int]$StatusCode,
    [string]$StatusText,
    [string]$Text
  )
  Send-HttpResponse $Stream $StatusCode $StatusText "text/plain; charset=utf-8" $utf8.GetBytes($Text)
}

function Test-DesignerConfig {
  param([string]$Content)

  $match = [regex]::Match($Content, '^\s*globalThis\.GSS0_DESIGNER_CONFIG\s*=\s*(?<json>\{[\s\S]*\})\s*;\s*$')
  if (!$match.Success) { return $false }
  try {
    $config = $match.Groups["json"].Value | ConvertFrom-Json
    return $config.schemaVersion -eq 5 -and $null -ne $config.balance -and $null -ne $config.moduleCooldownPercentages -and $null -ne $config.moduleStates
  } catch {
    return $false
  }
}

function Save-DesignerConfig {
  param([string]$Content)

  $temporaryPath = "$configPath.$([Guid]::NewGuid().ToString('N')).tmp"
  [IO.File]::WriteAllText($temporaryPath, $Content, $utf8)
  try {
    if ([IO.File]::Exists($configPath)) {
      try { [IO.File]::Replace($temporaryPath, $configPath, $null) }
      catch {
        [IO.File]::Delete($configPath)
        [IO.File]::Move($temporaryPath, $configPath)
      }
    } else {
      [IO.File]::Move($temporaryPath, $configPath)
    }
  } finally {
    if ([IO.File]::Exists($temporaryPath)) { [IO.File]::Delete($temporaryPath) }
  }
}

if ($SelfTest) {
  $currentConfig = [IO.File]::ReadAllText($configPath, [Text.Encoding]::UTF8)
  if (!(Test-DesignerConfig $currentConfig)) { throw "designer-config.js failed validation." }
  if ($editorToken.Length -ne 64) { throw "Editor token generation failed." }
  Write-Host "Balance editor launcher self-test passed."
  exit 0
}

$listener = $null
$port = 0
for ($candidate = $PreferredPort; $candidate -lt $PreferredPort + 20; $candidate += 1) {
  $candidateListener = $null
  try {
    $candidateListener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $candidate)
    $candidateListener.Start()
    $listener = $candidateListener
    $port = $candidate
    break
  } catch {
    if ($null -ne $candidateListener) { $candidateListener.Stop() }
  }
}
if ($null -eq $listener) { throw "No available localhost port was found." }

$editorUrl = "http://127.0.0.1:$port/balance-editor.html#editor-token=$editorToken"
Write-Host "PROJECT GSS0 balance editor is running at $editorUrl"
Write-Host "Keep this window open while editing. Press Ctrl+C to stop."
Start-Process $editorUrl

$staticFiles = @{
  "/" = "balance-editor.html"
  "/balance-editor.html" = "balance-editor.html"
  "/designer-config.js" = "designer-config.js"
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    try {
      $client.NoDelay = $true
      $stream = $client.GetStream()
      $request = Read-HttpRequest $stream
      $requestPath = ($request.Target -split "\?", 2)[0]

      if ($requestPath.StartsWith("/api/")) {
        if ($request.Headers["X-GSS0-Editor-Token"] -ne $editorToken) {
          Send-TextResponse $stream 403 "Forbidden" "Invalid editor token."
          continue
        }
        if ($requestPath -eq "/api/config" -and $request.Method -eq "GET") {
          Send-HttpResponse $stream 200 "OK" "text/javascript; charset=utf-8" ([IO.File]::ReadAllBytes($configPath))
          continue
        }
        if ($requestPath -eq "/api/config" -and $request.Method -eq "PUT") {
          $content = [Text.Encoding]::UTF8.GetString($request.Body)
          if (!(Test-DesignerConfig $content)) {
            Send-TextResponse $stream 400 "Bad Request" "Invalid designer configuration."
            continue
          }
          Save-DesignerConfig $content
          Send-TextResponse $stream 200 "OK" "saved"
          continue
        }
        Send-TextResponse $stream 404 "Not Found" "Unknown editor API route."
        continue
      }

      if ($request.Method -ne "GET" -or !$staticFiles.ContainsKey($requestPath)) {
        Send-TextResponse $stream 404 "Not Found" "Not found."
        continue
      }
      $fileName = $staticFiles[$requestPath]
      $contentType = if ($fileName.EndsWith(".js")) { "text/javascript; charset=utf-8" } else { "text/html; charset=utf-8" }
      Send-HttpResponse $stream 200 "OK" $contentType ([IO.File]::ReadAllBytes((Join-Path $projectRoot $fileName)))
    } catch {
      if ($null -ne $stream -and $stream.CanWrite) {
        try { Send-TextResponse $stream 500 "Internal Server Error" $_.Exception.Message } catch {}
      }
    } finally {
      if ($null -ne $stream) { $stream.Dispose() }
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
