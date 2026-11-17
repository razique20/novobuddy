use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaInstallationStatus {
    pub is_installed: bool,
    pub is_running: bool,
    pub binary_path: Option<String>,
    pub app_path: Option<String>,
    pub version: Option<String>,
    pub endpoint: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModelDetails {
    pub name: String,
    pub size: u64,
    pub size_formatted: String,
    pub modified_at: String,
    pub digest: String,
}

#[derive(Debug, Deserialize)]
struct OllamaApiResponse {
    models: Option<Vec<OllamaApiModel>>,
}

#[derive(Debug, Deserialize)]
struct OllamaApiModel {
    name: Option<String>,
    model: Option<String>,
    size: Option<u64>,
    modified_at: Option<String>,
    digest: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaVersionResponse {
    version: Option<String>,
}

pub struct OllamaService;

impl OllamaService {
    fn format_bytes(bytes: u64) -> String {
        if bytes == 0 {
            return "Cloud / Unknown".to_string();
        }
        let gb = bytes as f64 / (1024.0 * 1024.0 * 1024.0);
        if gb >= 1.0 {
            format!("{:.1} GB", gb)
        } else {
            let mb = bytes as f64 / (1024.0 * 1024.0);
            format!("{:.0} MB", mb)
        }
    }

    /// Locate installed binary and macOS app bundle
    pub fn locate_ollama() -> (Option<String>, Option<String>) {
        let mut app_path = None;
        let mut binary_path = None;

        // Check standard macOS App bundle
        let possible_apps = [
            "/Applications/Ollama.app",
            "/Applications/Utilities/Ollama.app",
        ];
        for app in possible_apps {
            if std::path::Path::new(app).exists() {
                app_path = Some(app.to_string());
                break;
            }
        }
        if app_path.is_none() {
            if let Some(home) = dirs::home_dir() {
                let user_app = home.join("Applications/Ollama.app");
                if user_app.exists() {
                    app_path = Some(user_app.to_string_lossy().to_string());
                }
            }
        }

        // Check CLI binary paths
        let possible_binaries = [
            "/usr/local/bin/ollama",
            "/opt/homebrew/bin/ollama",
            "/usr/bin/ollama",
        ];
        for bin in possible_binaries {
            if std::path::Path::new(bin).exists() {
                binary_path = Some(bin.to_string());
                break;
            }
        }
        if binary_path.is_none() {
            if let Some(home) = dirs::home_dir() {
                let user_bin = home.join(".ollama/bin/ollama");
                if user_bin.exists() {
                    binary_path = Some(user_bin.to_string_lossy().to_string());
                }
            }
        }
        if binary_path.is_none() {
            if let Ok(output) = Command::new("which").arg("ollama").output() {
                if output.status.success() {
                    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !path.is_empty() && std::path::Path::new(&path).exists() {
                        binary_path = Some(path);
                    }
                }
            }
        }

        (binary_path, app_path)
    }

    /// Query comprehensive installation and server status
    pub fn get_installation_status(endpoint: Option<&str>) -> OllamaInstallationStatus {
        let ep = endpoint.unwrap_or("http://localhost:11434").trim_end_matches('/');
        let (binary_path, app_path) = Self::locate_ollama();
        let is_installed = binary_path.is_some() || app_path.is_some();

        // Check if server is running by pinging /api/version
        let version_url = format!("{}/api/version", ep);
        let mut is_running = false;
        let mut version = None;

        if let Ok(output) = Command::new("/usr/bin/curl")
            .args(["-s", "--connect-timeout", "1", "--max-time", "2", &version_url])
            .output()
        {
            if output.status.success() {
                if let Ok(ver_data) = serde_json::from_slice::<OllamaVersionResponse>(&output.stdout) {
                    version = ver_data.version;
                    is_running = true;
                } else if !output.stdout.is_empty() {
                    is_running = true;
                }
            }
        }

        let message = if is_running {
            match &version {
                Some(v) => format!("Ollama server is active (v{})", v),
                None => "Ollama server is online and responding".to_string(),
            }
        } else if is_installed {
            "Ollama is installed on your device but the background server is stopped".to_string()
        } else {
            "Ollama is not installed on this machine. Download it to run private on-device models.".to_string()
        };

        OllamaInstallationStatus {
            is_installed,
            is_running,
            binary_path,
            app_path,
            version,
            endpoint: ep.to_string(),
            message,
        }
    }

    /// List models installed on the local device
    pub fn list_installed_models(endpoint: Option<&str>) -> Result<Vec<OllamaModelDetails>, String> {
        let ep = endpoint.unwrap_or("http://localhost:11434").trim_end_matches('/');

        // 1. Try REST API first
        let url = format!("{}/api/tags", ep);
        if let Ok(output) = Command::new("/usr/bin/curl")
            .args(["-s", "--connect-timeout", "2", "--max-time", "4", &url])
            .output()
        {
            if output.status.success() {
                if let Ok(api_res) = serde_json::from_slice::<OllamaApiResponse>(&output.stdout) {
                    if let Some(models) = api_res.models {
                        let result: Vec<OllamaModelDetails> = models
                            .into_iter()
                            .filter_map(|m| {
                                let name = m.name.or(m.model)?;
                                let size = m.size.unwrap_or(0);
                                Some(OllamaModelDetails {
                                    name,
                                    size,
                                    size_formatted: Self::format_bytes(size),
                                    modified_at: m.modified_at.unwrap_or_else(|| "Installed".to_string()),
                                    digest: m.digest.unwrap_or_default(),
                                })
                            })
                            .collect();
                        return Ok(result);
                    }
                }
            }
        }

        // 2. Fallback to CLI `ollama list`
        let (bin, _) = Self::locate_ollama();
        let which_ollama = bin.unwrap_or_else(|| "ollama".to_string());

        let cli_output = Command::new(&which_ollama)
            .arg("list")
            .output()
            .map_err(|e| format!("Failed to run ollama CLI: {}", e))?;

        if !cli_output.status.success() {
            let err = String::from_utf8_lossy(&cli_output.stderr);
            return Err(format!("Ollama CLI error: {}", err.trim()));
        }

        let stdout = String::from_utf8_lossy(&cli_output.stdout);
        let mut models = Vec::new();

        // Parse `ollama list` output format:
        // NAME   ID   SIZE   MODIFIED
        for (i, line) in stdout.lines().enumerate() {
            if i == 0 || line.trim().is_empty() {
                continue; // Skip header
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            if !parts.is_empty() {
                let name = parts[0].to_string();
                let digest = if parts.len() > 1 { parts[1].to_string() } else { "".to_string() };
                let size_str = if parts.len() > 3 {
                    format!("{} {}", parts[2], parts[3])
                } else if parts.len() > 2 {
                    parts[2].to_string()
                } else {
                    "Unknown".to_string()
                };

                models.push(OllamaModelDetails {
                    name,
                    size: 0,
                    size_formatted: size_str,
                    modified_at: "Installed".to_string(),
                    digest,
                });
            }
        }

        Ok(models)
    }

    /// Pull / download a model by name
    pub fn pull_model(model_name: &str) -> Result<String, String> {
        let trimmed = model_name.trim();
        if trimmed.is_empty() {
            return Err("Model name cannot be empty".to_string());
        }

        let (bin, _) = Self::locate_ollama();
        let which_ollama = bin.unwrap_or_else(|| "ollama".to_string());

        let output = Command::new(&which_ollama)
            .args(["pull", trimmed])
            .output()
            .map_err(|e| format!("Failed to execute ollama pull: {}", e))?;

        if output.status.success() {
            Ok(format!("Model '{}' pulled successfully", trimmed))
        } else {
            let err = String::from_utf8_lossy(&output.stderr);
            Err(format!("Ollama pull error: {}", err.trim()))
        }
    }

    /// Delete / remove a model from device
    pub fn delete_model(model_name: &str) -> Result<String, String> {
        let trimmed = model_name.trim();
        if trimmed.is_empty() {
            return Err("Model name cannot be empty".to_string());
        }

        let (bin, _) = Self::locate_ollama();
        let which_ollama = bin.unwrap_or_else(|| "ollama".to_string());

        let output = Command::new(&which_ollama)
            .args(["rm", trimmed])
            .output()
            .map_err(|e| format!("Failed to execute ollama rm: {}", e))?;

        if output.status.success() {
            Ok(format!("Model '{}' deleted successfully", trimmed))
        } else {
            let err = String::from_utf8_lossy(&output.stderr);
            Err(format!("Ollama delete error: {}", err.trim()))
        }
    }

    /// Launch Ollama server with automatic macOS App/CLI discovery and polling
    pub fn start_server() -> Result<String, String> {
        let status = Self::get_installation_status(None);

        if status.is_running {
            return Ok("Ollama server is already running.".to_string());
        }

        if !status.is_installed {
            return Err(
                "Ollama is not installed on this device. Please download and install it from https://ollama.com/download".to_string()
            );
        }

        // 1. Try launching macOS application bundle if present
        let mut launched = false;
        if let Some(app) = &status.app_path {
            if let Ok(mut child) = Command::new("open").args(["-a", app]).spawn() {
                let _ = child.wait();
                launched = true;
            }
        }

        // 2. If app launch was not possible, spawn the binary serve command
        if !launched {
            if let Some(bin) = &status.binary_path {
                let _child = Command::new(bin)
                    .arg("serve")
                    .stdin(std::process::Stdio::null())
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .spawn()
                    .map_err(|e| format!("Failed to launch 'ollama serve': {}", e))?;
                launched = true;
            }
        }

        if !launched {
            return Err("Could not find a valid Ollama binary or application bundle to launch.".to_string());
        }

        // 3. Poll http://localhost:11434/api/version up to 12 times (400ms each, ~4.8s max)
        for _ in 0..12 {
            std::thread::sleep(std::time::Duration::from_millis(400));
            if let Ok(output) = Command::new("/usr/bin/curl")
                .args(["-s", "--connect-timeout", "1", "http://localhost:11434/api/version"])
                .output()
            {
                if output.status.success() && !output.stdout.is_empty() {
                    return Ok("Ollama server started successfully and is now online.".to_string());
                }
            }
        }

        Ok("Ollama launch signal sent. The server is initializing and should be ready in a moment.".to_string())
    }

    /// Stop Ollama server if running
    pub fn stop_server() -> Result<String, String> {
        let output = Command::new("pkill")
            .args(["-f", "ollama serve"])
            .output();

        match output {
            Ok(_) => Ok("Ollama server stopped.".to_string()),
            Err(e) => Err(format!("Failed to stop Ollama: {}", e)),
        }
    }

    /// Stream a chat completion via native curl subprocess.
    /// Each token is sent through the channel as a String.
    /// Sentinel values: "__DONE__" on completion, "__ERROR__:..." on failure.
    pub fn stream_chat(
        endpoint: Option<&str>,
        model: &str,
        messages_json: &str,
        channel: &tauri::ipc::Channel<String>,
    ) -> Result<(), String> {
        let ep = endpoint.unwrap_or("http://127.0.0.1:11434").trim_end_matches('/');
        let url = format!("{}/api/chat", ep);

        // Build the JSON body
        let body = format!(
            r#"{{"model":"{}","messages":{},"stream":true,"options":{{"temperature":0.7,"num_predict":2048}}}}"#,
            model, messages_json
        );

        let mut child = Command::new("/usr/bin/curl")
            .args([
                "-N", "-s",
                "--connect-timeout", "5",
                "--max-time", "120",
                "-X", "POST",
                "-H", "Content-Type: application/json",
                "-d", &body,
                &url,
            ])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn curl for Ollama chat: {}", e))?;

        let stdout = child.stdout.take()
            .ok_or_else(|| "Failed to capture curl stdout".to_string())?;

        use std::io::BufRead;
        let reader = std::io::BufReader::new(stdout);

        for line in reader.lines() {
            match line {
                Ok(text) => {
                    let trimmed = text.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    // Try to parse as JSON
                    match serde_json::from_str::<serde_json::Value>(trimmed) {
                        Ok(parsed) => {
                            // Check for API-level errors
                            if let Some(err) = parsed.get("error").and_then(|v| v.as_str()) {
                                let _ = channel.send(format!("__ERROR__:{}", err));
                                let _ = channel.send("__DONE__".to_string());
                                let _ = child.kill();
                                return Ok(());
                            }

                            // Extract token from .message.content
                            if let Some(content) = parsed
                                .get("message")
                                .and_then(|m| m.get("content"))
                                .and_then(|c| c.as_str())
                            {
                                if !content.is_empty() {
                                    let _ = channel.send(content.to_string());
                                }
                            }

                            // Check if done
                            if parsed.get("done").and_then(|d| d.as_bool()).unwrap_or(false) {
                                let _ = channel.send("__DONE__".to_string());
                                return Ok(());
                            }
                        }
                        Err(_) => {
                            // Non-JSON output, could be curl error message
                            if !trimmed.is_empty() {
                                let _ = channel.send(format!("__ERROR__:Unexpected response: {}", trimmed));
                                let _ = channel.send("__DONE__".to_string());
                                let _ = child.kill();
                                return Ok(());
                            }
                        }
                    }
                }
                Err(e) => {
                    let _ = channel.send(format!("__ERROR__:Stream read error: {}", e));
                    let _ = channel.send("__DONE__".to_string());
                    let _ = child.kill();
                    return Ok(());
                }
            }
        }

        // If we get here without a done signal, the stream ended
        let _ = channel.send("__DONE__".to_string());

        // Wait for child to finish and check stderr
        if let Ok(output) = child.wait_with_output() {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if !stderr.trim().is_empty() {
                    log::warn!("curl stderr during Ollama chat: {}", stderr.trim());
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_bytes() {
        assert_eq!(OllamaService::format_bytes(0), "Cloud / Unknown");
        assert_eq!(OllamaService::format_bytes(95420416), "91 MB");
        assert_eq!(OllamaService::format_bytes(4661224676), "4.3 GB");
    }

    #[test]
    fn test_list_installed_models() {
        let res = OllamaService::list_installed_models(None);
        assert!(res.is_ok(), "Expected list_installed_models to succeed");
        let models = res.unwrap();
        assert!(!models.is_empty(), "Expected at least one installed model");
        assert!(models.iter().any(|m| m.name.contains("smollm")));
    }
}
