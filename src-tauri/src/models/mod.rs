use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    // General
    pub launch_at_startup: bool,
    pub start_minimized: bool,
    pub theme: String, // "dark" | "light" | "system"
    pub language: String,

    // Appearance
    pub compact_mode: bool,
    pub enable_animations: bool,

    // Shortcuts
    pub global_shortcut: String, // e.g., "Option+Space"
    pub shortcut_enabled: bool,

    // Privacy
    pub data_retention_days: i32,
    pub telemetry_enabled: bool,

    // Screen & Visual Privacy (Phase 3)
    #[serde(default = "default_true")]
    pub screen_capture_enabled: bool,
    #[serde(default)]
    pub excluded_applications: Vec<String>,
    #[serde(default = "default_ephemeral")]
    pub screenshot_retention_policy: String, // "ephemeral" | "session" | "30_days"
    #[serde(default = "default_true")]
    pub ocr_enabled: bool,

    // Onboarding
    pub onboarding_completed: bool,
}

fn default_true() -> bool {
    true
}

fn default_ephemeral() -> String {
    "ephemeral".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            launch_at_startup: false,
            start_minimized: false,
            theme: "dark".to_string(),
            language: "English".to_string(),
            compact_mode: false,
            enable_animations: true,
            global_shortcut: "Option+Space".to_string(),
            shortcut_enabled: true,
            data_retention_days: 30,
            telemetry_enabled: false,
            screen_capture_enabled: true,
            excluded_applications: vec![
                "Keychain Access".to_string(),
                "1Password".to_string(),
                "Bitwarden".to_string(),
            ],
            screenshot_retention_policy: "ephemeral".to_string(),
            ocr_enabled: true,
            onboarding_completed: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageAttachment {
    pub id: String,
    pub source_type: String, // "display" | "window" | "region" | "upload"
    pub source_name: String,
    pub mime_type: String,
    pub width: u32,
    pub height: u32,
    pub file_size_bytes: usize,
    pub data_url: Option<String>,
    pub ocr_text: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
    pub created_at: String,
    pub tokens: Option<i32>,
    pub is_simulated: bool,
    #[serde(default)]
    pub attachments: Option<Vec<MessageAttachment>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStatus {
    pub os_name: String,
    pub os_version: String,
    pub arch: String,
    pub app_version: String,
    pub database_status: String,
    pub bridge_status: String,
    pub active_window: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShortcutStatus {
    pub shortcut: String,
    pub is_registered: bool,
    pub description: String,
}
