use crate::models::{AppSettings, Conversation, Message, ShortcutStatus, SystemStatus};
use crate::services::db::DbService;
use crate::state::AppState;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::get_settings(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_app_settings(settings: AppSettings, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::save_settings(&conn, &settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_conversations(state: State<'_, AppState>) -> Result<Vec<Conversation>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::get_conversations(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_conversation(
    id: String,
    title: String,
    state: State<'_, AppState>,
) -> Result<Conversation, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::create_conversation(&conn, &id, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_conversation(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::delete_conversation(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_messages(
    conversation_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<Message>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::get_messages(&conn, &conversation_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_message(message: Message, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::save_message(&conn, &message).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_all_data(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    DbService::clear_all_data(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_floating_window(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("floating") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            window.hide().map_err(|e| e.to_string())?;
            Ok(false)
        } else {
            let _ = window.center();
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            Ok(true)
        }
    } else {
        Err("Floating window not found".to_string())
    }
}

#[tauri::command]
pub fn show_floating_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating") {
        let _ = window.center();
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Floating window not found".to_string())
    }
}

#[tauri::command]
pub fn hide_floating_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("floating") {
        window.hide().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Floating window not found".to_string())
    }
}

#[tauri::command]
pub fn open_main_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
pub fn get_system_status(app: AppHandle) -> Result<SystemStatus, String> {
    let os_name = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();

    let active_window = if let Some(main) = app.get_webview_window("main") {
        if main.is_focused().unwrap_or(false) {
            "Main Dashboard".to_string()
        } else if let Some(floating) = app.get_webview_window("floating") {
            if floating.is_focused().unwrap_or(false) {
                "Floating Assistant".to_string()
            } else {
                "Background / Standby".to_string()
            }
        } else {
            "Standby".to_string()
        }
    } else {
        "Standby".to_string()
    };

    Ok(SystemStatus {
        os_name,
        os_version: "macOS 15 (Sequoia)".to_string(),
        arch,
        app_version: "0.1.0-alpha (Phase 1)".to_string(),
        database_status: "SQLite Active (Local)".to_string(),
        bridge_status: "Native IPC Ready".to_string(),
        active_window,
    })
}

#[tauri::command]
pub fn get_shortcut_status(state: State<'_, AppState>) -> Result<ShortcutStatus, String> {
    let is_reg = *state.shortcut_registered.lock().unwrap_or_else(|e| e.into_inner());
    Ok(ShortcutStatus {
        shortcut: "Option + Space".to_string(),
        is_registered: is_reg,
        description: "Global toggle for NOVA Floating Companion".to_string(),
    })
}
