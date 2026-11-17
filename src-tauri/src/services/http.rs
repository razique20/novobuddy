use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeHttpResponse {
    pub status: u16,
    pub body: String,
    pub ok: bool,
}

pub struct HttpService;

impl HttpService {
    /// Perform a native HTTP request via curl, completely bypassing WebKit ATS/CORS restrictions
    pub fn request(
        url: &str,
        method: Option<&str>,
        headers: Option<Vec<(String, String)>>,
        body: Option<&str>,
    ) -> Result<NativeHttpResponse, String> {
        let mut cmd = Command::new("/usr/bin/curl");
        cmd.arg("-s")
            .arg("-w")
            .arg("\n__STATUS__:%{http_code}")
            .arg("-X")
            .arg(method.unwrap_or("GET"));

        if let Some(hdrs) = headers {
            for (k, v) in hdrs {
                cmd.arg("-H").arg(format!("{}: {}", k, v));
            }
        }

        if let Some(b) = body {
            cmd.arg("-d").arg(b);
        }

        cmd.arg(url);

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to execute curl: {}", e))?;

        let full_output = String::from_utf8_lossy(&output.stdout).to_string();

        if let Some(idx) = full_output.rfind("\n__STATUS__:") {
            let body_part = &full_output[..idx];
            let status_str = &full_output[idx + "\n__STATUS__:".len()..];
            let status_code: u16 = status_str.trim().parse().unwrap_or(0);
            Ok(NativeHttpResponse {
                status: status_code,
                body: body_part.to_string(),
                ok: status_code >= 200 && status_code < 300,
            })
        } else {
            Ok(NativeHttpResponse {
                status: if output.status.success() { 200 } else { 500 },
                body: full_output,
                ok: output.status.success(),
            })
        }
    }

    /// Stream SSE tokens from cloud providers (Groq, OpenAI, Anthropic) via native curl
    pub fn stream_sse(
        url: &str,
        headers: Option<Vec<(String, String)>>,
        body: &str,
        channel: &tauri::ipc::Channel<String>,
    ) -> Result<(), String> {
        let mut cmd = Command::new("/usr/bin/curl");
        cmd.arg("-s")
            .arg("-N")
            .arg("-X")
            .arg("POST");

        if let Some(hdrs) = headers {
            for (k, v) in hdrs {
                cmd.arg("-H").arg(format!("{}: {}", k, v));
            }
        }

        cmd.arg("-d").arg(body);
        cmd.arg(url);

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn curl: {}", e))?;

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let reader = BufReader::new(stdout);

        for line in reader.lines() {
            match line {
                Ok(text) => {
                    let trimmed = text.trim();
                    if trimmed.is_empty() || trimmed.starts_with(':') {
                        continue;
                    }

                    if trimmed.starts_with('{') {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(trimmed) {
                            if let Some(err) = parsed
                                .get("error")
                                .and_then(|e| e.get("message"))
                                .and_then(|m| m.as_str())
                            {
                                let _ = channel.send(format!("__ERROR__:{}", err));
                                let _ = channel.send("__DONE__".to_string());
                                let _ = child.kill();
                                return Ok(());
                            }
                        }
                    }

                    if trimmed.starts_with("data:") {
                        let data_str = trimmed["data:".len()..].trim();
                        if data_str == "[DONE]" {
                            let _ = channel.send("__DONE__".to_string());
                            let _ = child.kill();
                            return Ok(());
                        }

                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data_str) {
                            if let Some(err) = parsed
                                .get("error")
                                .and_then(|e| e.get("message"))
                                .and_then(|m| m.as_str())
                            {
                                let _ = channel.send(format!("__ERROR__:{}", err));
                                let _ = channel.send("__DONE__".to_string());
                                let _ = child.kill();
                                return Ok(());
                            }

                            // OpenAI / Groq standard: choices[0].delta.content
                            if let Some(delta) = parsed
                                .get("choices")
                                .and_then(|c| c.get(0))
                                .and_then(|ch| ch.get("delta"))
                            {
                                if let Some(content) = delta.get("content").and_then(|c| c.as_str()) {
                                    if !content.is_empty() {
                                        let _ = channel.send(content.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = channel.send(format!("__ERROR__:Stream error: {}", e));
                    let _ = channel.send("__DONE__".to_string());
                    let _ = child.kill();
                    return Ok(());
                }
            }
        }

        let _ = channel.send("__DONE__".to_string());
        let _ = child.wait();
        Ok(())
    }
}
