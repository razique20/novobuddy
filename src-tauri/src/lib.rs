pub mod commands;
pub mod models;
pub mod services;
pub mod state;

use commands::*;
use services::db::DbService;
use state::AppState;
use std::fs;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = {
        // App data path
        let home_dir = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("/tmp"));
        let nova_dir = home_dir.join(".nova");
        let _ = fs::create_dir_all(&nova_dir);
        let db_path = nova_dir.join("nova.db");

        let conn = rusqlite::Connection::open(&db_path).expect("Failed to open SQLite database");
        DbService::init(&conn).expect("Failed to initialize database schema");

        AppState {
            db: Mutex::new(conn),
            shortcut_registered: Mutex::new(false),
        }
    };

    tauri::Builder::default()
        .manage(app_state)
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Setup System Tray
            let open_main = MenuItem::with_id(app, "open_main", "Open NOVA", true, None::<&str>)?;
            let open_floating = MenuItem::with_id(
                app,
                "open_floating",
                "Floating Assistant (⌥Space)",
                true,
                None::<&str>,
            )?;
            let sep = MenuItem::with_id(app, "sep", "---", false, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit NOVA", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[&open_main, &open_floating, &sep, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open_main" => {
                        let _ = open_main_window(app.clone());
                    }
                    "open_floating" => {
                        let _ = show_floating_window(app.clone());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Register Global Shortcut (Option+Space / Alt+Space)
            let shortcut_str = "Alt+Space"; // In Tauri global shortcut, Alt corresponds to Option on macOS
            let shortcut: Result<Shortcut, _> = shortcut_str.parse();
            let app_handle = app.handle().clone();

            match shortcut {
                Ok(sc) => {
                    let reg_result = app.global_shortcut().on_shortcut(sc, move |_app, _shortcut, event| {
                        if event.state() == ShortcutState::Pressed {
                            let _ = toggle_floating_window(app_handle.clone());
                        }
                    });

                    if reg_result.is_ok() {
                        let state = app.state::<AppState>();
                        if let Ok(mut lock) = state.shortcut_registered.lock() {
                            *lock = true;
                        }
                        log::info!("Global shortcut Option+Space registered successfully");
                    } else {
                        log::warn!("Global shortcut could not be registered (may already be in use)");
                    }
                }
                Err(e) => {
                    log::error!("Failed to parse global shortcut: {:?}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // For the main window, close hides to tray instead of quitting app
            if window.label() == "main" {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_app_settings,
            save_app_settings,
            get_conversations,
            create_conversation,
            delete_conversation,
            get_messages,
            save_message,
            clear_all_data,
            toggle_floating_window,
            show_floating_window,
            hide_floating_window,
            open_main_window,
            get_system_status,
            get_shortcut_status,
            update_conversation_title,
            store_api_key,
            get_api_key,
            delete_api_key,
            has_api_key,
            get_ollama_installation_status,
            get_ollama_installed_models,
            pull_ollama_model,
            delete_ollama_model,
            start_ollama_server,
            stop_ollama_server,
            stream_ollama_chat,
            native_http_request,
            native_stream_chat,
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
