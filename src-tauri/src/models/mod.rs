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

    // Onboarding
    pub onboarding_completed: bool,
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
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String, // "user" | "assistant" | "system"
    pub content: String,
    pub created_at: String,
    pub tokens: Option<i32>,
    pub is_simulated: bool,
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
