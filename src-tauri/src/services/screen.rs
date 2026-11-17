use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenPermissionStatus {
    pub has_permission: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenDisplayInfo {
    pub id: usize,
    pub index: usize,
    pub name: String,
    pub is_main: bool,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenWindowInfo {
    pub id: usize,
    pub app_name: String,
    pub title: String,
    pub pid: u32,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRegion {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenCaptureResult {
    pub success: bool,
    pub cancelled: bool,
    pub base64_image: Option<String>,
    pub data_url: Option<String>,
    pub width: u32,
    pub height: u32,
    pub mime_type: String,
    pub source_type: String,
    pub source_name: String,
    pub file_size_bytes: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrTextItem {
    pub text: String,
    pub confidence: f32,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub struct ScreenCaptureService;

impl ScreenCaptureService {
    fn get_helper_binary_path() -> PathBuf {
        // Try relative to bundle or current executable
        let possible_paths = [
            PathBuf::from("bin/nova-screen-helper"),
            PathBuf::from("src-tauri/bin/nova-screen-helper"),
            PathBuf::from("./nova-screen-helper"),
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("/tmp"))
                .join("Desktop/nova/src-tauri/bin/nova-screen-helper"),
        ];

        for p in &possible_paths {
            if p.exists() {
                return p.clone();
            }
        }

        PathBuf::from("nova-screen-helper")
    }

    /// Check if macOS Screen Recording permission is currently granted
    pub fn check_permission() -> Result<ScreenPermissionStatus, String> {
        #[cfg(target_os = "macos")]
        {
            let helper = Self::get_helper_binary_path();
            if let Ok(output) = Command::new(&helper).arg("check-permission").output() {
                if output.status.success() {
                    let str_output = String::from_utf8_lossy(&output.stdout);
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&str_output) {
                        let has_perm = parsed["has_permission"].as_bool().unwrap_or(false);
                        return Ok(ScreenPermissionStatus {
                            has_permission: has_perm,
                            message: if has_perm {
                                "Screen Recording permission is active.".to_string()
                            } else {
                                "Screen Recording permission not yet granted by macOS.".to_string()
                            },
                        });
                    }
                }
            }
            Ok(ScreenPermissionStatus {
                has_permission: false,
                message: "Unable to verify screen permission. Helper tool not found.".to_string(),
            })
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(ScreenPermissionStatus {
                has_permission: true,
                message: "Non-macOS platform".to_string(),
            })
        }
    }

    /// Trigger macOS prompt or open System Settings for Screen Recording
    pub fn request_permission() -> Result<ScreenPermissionStatus, String> {
        #[cfg(target_os = "macos")]
        {
            let helper = Self::get_helper_binary_path();
            let _ = Command::new(&helper).arg("request-permission").output();
            Self::check_permission()
        }

        #[cfg(not(target_os = "macos"))]
        {
            Self::check_permission()
        }
    }

    /// Enumerate all active displays
    pub fn list_displays() -> Result<Vec<ScreenDisplayInfo>, String> {
        #[cfg(target_os = "macos")]
        {
            let helper = Self::get_helper_binary_path();
            let output = Command::new(&helper)
                .arg("list-displays")
                .output()
                .map_err(|e| format!("Failed to execute list-displays: {}", e))?;

            if !output.status.success() {
                return Err("Failed to retrieve display list".to_string());
            }

            let str_output = String::from_utf8_lossy(&output.stdout);
            serde_json::from_str(&str_output)
                .map_err(|e| format!("Failed to parse display list JSON: {}", e))
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(vec![ScreenDisplayInfo {
                id: 1,
                index: 1,
                name: "Primary Display".to_string(),
                is_main: true,
                width: 1920,
                height: 1080,
            }])
        }
    }

    /// Enumerate all on-screen application windows
    pub fn list_windows() -> Result<Vec<ScreenWindowInfo>, String> {
        #[cfg(target_os = "macos")]
        {
            let helper = Self::get_helper_binary_path();
            let output = Command::new(&helper)
                .arg("list-windows")
                .output()
                .map_err(|e| format!("Failed to execute list-windows: {}", e))?;

            if !output.status.success() {
                return Err("Failed to retrieve window list".to_string());
            }

            let str_output = String::from_utf8_lossy(&output.stdout);
            serde_json::from_str(&str_output)
                .map_err(|e| format!("Failed to parse window list JSON: {}", e))
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(vec![])
        }
    }

    /// Capture native screen, window, or region
    pub fn capture_screen(
        mode: &str, // "display" | "window" | "region"
        target_id: Option<&str>,
        region: Option<CaptureRegion>,
        excluded_apps: Option<Vec<String>>,
    ) -> Result<ScreenCaptureResult, String> {
        #[cfg(target_os = "macos")]
        {
            // Verify permission first
            let perm = Self::check_permission()?;
            if !perm.has_permission {
                return Ok(ScreenCaptureResult {
                    success: false,
                    cancelled: false,
                    base64_image: None,
                    data_url: None,
                    width: 0,
                    height: 0,
                    mime_type: "image/png".to_string(),
                    source_type: mode.to_string(),
                    source_name: "Screen".to_string(),
                    file_size_bytes: 0,
                    error: Some("PERMISSION_DENIED".to_string()),
                });
            }

            // Check excluded applications policy if window capture is requested
            if mode == "window" {
                if let Some(w_id_str) = target_id {
                    if let Ok(w_id) = w_id_str.parse::<usize>() {
                        if let Ok(windows) = Self::list_windows() {
                            if let Some(target_win) = windows.iter().find(|w| w.id == w_id) {
                                if let Some(ref excluded) = excluded_apps {
                                    let lower_app = target_win.app_name.to_lowercase();
                                    for ex in excluded {
                                        if lower_app.contains(&ex.to_lowercase()) {
                                            return Ok(ScreenCaptureResult {
                                                success: false,
                                                cancelled: false,
                                                base64_image: None,
                                                data_url: None,
                                                width: 0,
                                                height: 0,
                                                mime_type: "image/png".to_string(),
                                                source_type: mode.to_string(),
                                                source_name: target_win.app_name.clone(),
                                                file_size_bytes: 0,
                                                error: Some(format!(
                                                    "BLOCKED_EXCLUDED_APP: Capture of '{}' is blocked by your screen privacy exclusion rules.",
                                                    target_win.app_name
                                                )),
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Generate temporary output file
            let tmp_filename = format!("nova_capture_{}_{}.png", std::process::id(), chrono::Utc::now().timestamp_millis());
            let tmp_path = std::env::temp_dir().join(&tmp_filename);

            let mut cmd = Command::new("/usr/sbin/screencapture");
            cmd.arg("-x"); // silent, no shutter sound

            let mut source_name = "Screen".to_string();

            match mode {
                "window" => {
                    cmd.arg("-o"); // no shadow
                    if let Some(w_id) = target_id {
                        cmd.arg(format!("-l{}", w_id));
                        // Lookup title
                        if let Ok(w_id_num) = w_id.parse::<usize>() {
                            if let Ok(wins) = Self::list_windows() {
                                if let Some(w) = wins.iter().find(|w| w.id == w_id_num) {
                                    source_name = format!("{} — {}", w.app_name, w.title);
                                }
                            }
                        }
                    } else {
                        return Err("Window capture requires a valid window ID".to_string());
                    }
                }
                "region" => {
                    source_name = "Selected Region".to_string();
                    if let Some(r) = region {
                        // Specified coordinate box
                        cmd.arg(format!("-R{},{},{},{}", r.x as i32, r.y as i32, r.width as i32, r.height as i32));
                    } else {
                        // Native interactive crosshairs selection mode
                        cmd.arg("-i").arg("-s");
                    }
                }
                "display" | _ => {
                    let d_idx = target_id.unwrap_or("1");
                    cmd.arg(format!("-D{}", d_idx));
                    source_name = format!("Display {}", d_idx);
                }
            }

            cmd.arg(&tmp_path);

            let _output = cmd.output().map_err(|e| format!("Failed to run screencapture: {}", e))?;

            // Check if file was created
            if !tmp_path.exists() {
                // If user pressed Escape during interactive selection, file is not created
                return Ok(ScreenCaptureResult {
                    success: false,
                    cancelled: true,
                    base64_image: None,
                    data_url: None,
                    width: 0,
                    height: 0,
                    mime_type: "image/png".to_string(),
                    source_type: mode.to_string(),
                    source_name,
                    file_size_bytes: 0,
                    error: Some("Selection cancelled by user".to_string()),
                });
            }

            let bytes = fs::read(&tmp_path).map_err(|e| format!("Failed to read capture image: {}", e))?;
            let _ = fs::remove_file(&tmp_path); // Clean up immediately for privacy

            if bytes.is_empty() {
                return Ok(ScreenCaptureResult {
                    success: false,
                    cancelled: true,
                    base64_image: None,
                    data_url: None,
                    width: 0,
                    height: 0,
                    mime_type: "image/png".to_string(),
                    source_type: mode.to_string(),
                    source_name,
                    file_size_bytes: 0,
                    error: Some("Empty screenshot captured".to_string()),
                });
            }

            // Extract PNG dimensions from IHDR chunk (header is 8 bytes, IHDR is next 4 + 4 + 8)
            let mut width: u32 = 0;
            let mut height: u32 = 0;
            if bytes.len() >= 24 && &bytes[0..8] == b"\x89PNG\r\n\x1a\n" {
                width = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
                height = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
            }

            let base64_str = {
                use base64_helper::encode_base64;
                encode_base64(&bytes)
            };

            let data_url = format!("data:image/png;base64,{}", base64_str);
            let file_size_bytes = bytes.len();

            Ok(ScreenCaptureResult {
                success: true,
                cancelled: false,
                base64_image: Some(base64_str),
                data_url: Some(data_url),
                width,
                height,
                mime_type: "image/png".to_string(),
                source_type: mode.to_string(),
                source_name,
                file_size_bytes,
                error: None,
            })
        }

        #[cfg(not(target_os = "macos"))]
        {
            Err("Native screen capture is only supported on macOS".to_string())
        }
    }

    /// Extract text from base64 image via Apple Vision framework
    pub fn perform_ocr(image_base64: &str) -> Result<Vec<OcrTextItem>, String> {
        #[cfg(target_os = "macos")]
        {
            let helper = Self::get_helper_binary_path();
            let raw_base64 = if let Some(idx) = image_base64.find("base64,") {
                &image_base64[idx + 7..]
            } else {
                image_base64
            };

            let bytes = {
                use base64_helper::decode_base64;
                decode_base64(raw_base64)?
            };

            let tmp_filename = format!("nova_ocr_{}_{}.png", std::process::id(), chrono::Utc::now().timestamp_millis());
            let tmp_path = std::env::temp_dir().join(&tmp_filename);
            fs::write(&tmp_path, &bytes).map_err(|e| format!("Failed to write OCR image: {}", e))?;

            let output = Command::new(&helper)
                .arg("ocr")
                .arg(&tmp_path)
                .output()
                .map_err(|e| format!("Failed to run OCR helper: {}", e))?;

            let _ = fs::remove_file(&tmp_path);

            if !output.status.success() {
                return Ok(vec![]);
            }

            let str_output = String::from_utf8_lossy(&output.stdout);
            serde_json::from_str(&str_output).map_err(|e| format!("Failed to parse OCR JSON: {}", e))
        }

        #[cfg(not(target_os = "macos"))]
        {
            Ok(vec![])
        }
    }
}

// Lightweight standard Base64 encoding/decoding without external crate version conflicts
mod base64_helper {
    const STANDARD_CHARS: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    pub fn encode_base64(input: &[u8]) -> String {
        let mut result = String::with_capacity((input.len() + 2) / 3 * 4);
        for chunk in input.chunks(3) {
            let b0 = chunk[0];
            let b1 = chunk.get(1).copied().unwrap_or(0);
            let b2 = chunk.get(2).copied().unwrap_or(0);

            let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);

            let c0 = STANDARD_CHARS[((n >> 18) & 63) as usize] as char;
            let c1 = STANDARD_CHARS[((n >> 12) & 63) as usize] as char;
            let c2 = if chunk.len() > 1 {
                STANDARD_CHARS[((n >> 6) & 63) as usize] as char
            } else {
                '='
            };
            let c3 = if chunk.len() > 2 {
                STANDARD_CHARS[(n & 63) as usize] as char
            } else {
                '='
            };

            result.push(c0);
            result.push(c1);
            result.push(c2);
            result.push(c3);
        }
        result
    }

    pub fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
        let clean = input.trim();
        let mut lookup = [255u8; 256];
        for (i, &c) in STANDARD_CHARS.iter().enumerate() {
            lookup[c as usize] = i as u8;
        }

        let mut output = Vec::with_capacity(clean.len() * 3 / 4);
        let mut buf = 0u32;
        let mut bits = 0;

        for &byte in clean.as_bytes() {
            if byte == b'=' {
                break;
            }
            let val = lookup[byte as usize];
            if val == 255 {
                continue; // skip whitespace
            }
            buf = (buf << 6) | (val as u32);
            bits += 6;
            if bits >= 8 {
                bits -= 8;
                output.push((buf >> bits) as u8);
            }
        }

        Ok(output)
    }
}
