use crate::models::{AppSettings, Conversation, Message};
use chrono::Utc;
use rusqlite::{params, Connection, Result};

pub struct DbService;

impl DbService {
    pub fn init(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                tokens INTEGER,
                is_simulated INTEGER DEFAULT 0,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            ",
        )?;

        // Seed initial conversation if none exists
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM conversations",
            [],
            |row| row.get(0),
        )?;

        if count == 0 {
            let now = Utc::now().to_rfc3339();
            let conv_id = "welcome-nova-session";
            
            conn.execute(
                "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
                params![conv_id, "Welcome to NOVA", now, now],
            )?;

            conn.execute(
                "INSERT INTO messages (id, conversation_id, role, content, created_at, tokens, is_simulated)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![
                    "msg-1",
                    conv_id,
                    "assistant",
                    "Hello! I am NOVA, your intelligent desktop companion. In Phase 1, our desktop foundation, window controls, and local persistence are active. How can I assist you today?",
                    now,
                    36,
                    1
                ],
            )?;
        }

        Ok(())
    }

    pub fn get_settings(conn: &Connection) -> Result<AppSettings> {
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        })?;

        let mut settings = AppSettings::default();

        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "launch_at_startup" => settings.launch_at_startup = value == "true",
                "start_minimized" => settings.start_minimized = value == "true",
                "theme" => settings.theme = value,
                "language" => settings.language = value,
                "compact_mode" => settings.compact_mode = value == "true",
                "enable_animations" => settings.enable_animations = value == "true",
                "global_shortcut" => settings.global_shortcut = value,
                "shortcut_enabled" => settings.shortcut_enabled = value == "true",
                "data_retention_days" => {
                    if let Ok(v) = value.parse::<i32>() {
                        settings.data_retention_days = v;
                    }
                }
                "telemetry_enabled" => settings.telemetry_enabled = value == "true",
                "onboarding_completed" => settings.onboarding_completed = value == "true",
                _ => {}
            }
        }

        Ok(settings)
    }

    pub fn save_settings(conn: &Connection, settings: &AppSettings) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        let items = [
            ("launch_at_startup", settings.launch_at_startup.to_string()),
            ("start_minimized", settings.start_minimized.to_string()),
            ("theme", settings.theme.clone()),
            ("language", settings.language.clone()),
            ("compact_mode", settings.compact_mode.to_string()),
            ("enable_animations", settings.enable_animations.to_string()),
            ("global_shortcut", settings.global_shortcut.clone()),
            ("shortcut_enabled", settings.shortcut_enabled.to_string()),
            ("data_retention_days", settings.data_retention_days.to_string()),
            ("telemetry_enabled", settings.telemetry_enabled.to_string()),
            ("onboarding_completed", settings.onboarding_completed.to_string()),
        ];

        let mut stmt = conn.prepare(
            "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        )?;

        for (k, v) in items {
            stmt.execute(params![k, v, now])?;
        }

        Ok(())
    }

    pub fn get_conversations(conn: &Connection) -> Result<Vec<Conversation>> {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.title, c.created_at, c.updated_at,
                    (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count
             FROM conversations c
             ORDER BY c.updated_at DESC",
        )?;

        let conv_iter = stmt.query_map([], |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                message_count: row.get(4)?,
            })
        })?;

        let mut conversations = Vec::new();
        for conv in conv_iter {
            conversations.push(conv?);
        }
        Ok(conversations)
    }

    pub fn create_conversation(conn: &Connection, id: &str, title: &str) -> Result<Conversation> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
            params![id, title, now, now],
        )?;

        Ok(Conversation {
            id: id.to_string(),
            title: title.to_string(),
            created_at: now.clone(),
            updated_at: now,
            message_count: 0,
        })
    }

    pub fn delete_conversation(conn: &Connection, id: &str) -> Result<()> {
        conn.execute("DELETE FROM conversations WHERE id = ?", params![id])?;
        Ok(())
    }

    pub fn update_conversation_title(conn: &Connection, id: &str, title: &str) -> Result<()> {
        let now = Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
            params![title, now, id],
        )?;
        Ok(())
    }

    pub fn get_messages(conn: &Connection, conversation_id: &str) -> Result<Vec<Message>> {
        let mut stmt = conn.prepare(
            "SELECT id, conversation_id, role, content, created_at, tokens, is_simulated
             FROM messages
             WHERE conversation_id = ?
             ORDER BY created_at ASC",
        )?;

        let msg_iter = stmt.query_map(params![conversation_id], |row| {
            let is_simulated_int: i32 = row.get(6)?;
            Ok(Message {
                id: row.get(0)?,
                conversation_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
                tokens: row.get(5)?,
                is_simulated: is_simulated_int != 0,
            })
        })?;

        let mut messages = Vec::new();
        for msg in msg_iter {
            messages.push(msg?);
        }
        Ok(messages)
    }

    pub fn save_message(conn: &Connection, message: &Message) -> Result<()> {
        let is_simulated_int = if message.is_simulated { 1 } else { 0 };
        conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, created_at, tokens, is_simulated)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                message.id,
                message.conversation_id,
                message.role,
                message.content,
                message.created_at,
                message.tokens,
                is_simulated_int,
            ],
        )?;

        // Update conversation updated_at
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            params![message.created_at, message.conversation_id],
        )?;

        Ok(())
    }

    pub fn clear_all_data(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "
            DELETE FROM messages;
            DELETE FROM conversations;
            DELETE FROM app_state;
            ",
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().expect("failed to open in-memory db");
        DbService::init(&conn).expect("failed to initialize db schema");
        conn
    }

    #[test]
    fn test_init_and_seed() {
        let conn = setup_test_db();
        let convs = DbService::get_conversations(&conn).expect("failed to get conversations");
        assert_eq!(convs.len(), 1);
        assert_eq!(convs[0].title, "Welcome to NOVA");

        let msgs = DbService::get_messages(&conn, &convs[0].id).expect("failed to get messages");
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].role, "assistant");
        assert!(msgs[0].is_simulated);
    }

    #[test]
    fn test_settings_persistence() {
        let conn = setup_test_db();
        let default_settings = DbService::get_settings(&conn).expect("failed to get settings");
        assert_eq!(default_settings.theme, "dark");
        assert_eq!(default_settings.global_shortcut, "Option+Space");

        let mut custom = default_settings.clone();
        custom.theme = "light".to_string();
        custom.compact_mode = true;
        custom.data_retention_days = 90;
        custom.onboarding_completed = true;

        DbService::save_settings(&conn, &custom).expect("failed to save settings");

        let loaded = DbService::get_settings(&conn).expect("failed to reload settings");
        assert_eq!(loaded.theme, "light");
        assert!(loaded.compact_mode);
        assert_eq!(loaded.data_retention_days, 90);
        assert!(loaded.onboarding_completed);
    }

    #[test]
    fn test_conversation_and_message_crud() {
        let conn = setup_test_db();
        let new_conv = DbService::create_conversation(&conn, "test-conv-1", "Test Title")
            .expect("failed to create conversation");
        assert_eq!(new_conv.id, "test-conv-1");
        assert_eq!(new_conv.title, "Test Title");

        let msg = Message {
            id: "msg-test-1".to_string(),
            conversation_id: "test-conv-1".to_string(),
            role: "user".to_string(),
            content: "What is NOVA?".to_string(),
            created_at: Utc::now().to_rfc3339(),
            tokens: Some(4),
            is_simulated: false,
        };

        DbService::save_message(&conn, &msg).expect("failed to save message");

        let messages = DbService::get_messages(&conn, "test-conv-1").expect("failed to load msgs");
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].content, "What is NOVA?");

        DbService::delete_conversation(&conn, "test-conv-1").expect("failed to delete conv");
        let messages_after =
            DbService::get_messages(&conn, "test-conv-1").expect("failed to load msgs");
        assert_eq!(messages_after.len(), 0);
    }

    #[test]
    fn test_clear_all_data() {
        let conn = setup_test_db();
        DbService::clear_all_data(&conn).expect("failed to clear data");
        let convs = DbService::get_conversations(&conn).expect("failed to get conversations");
        assert_eq!(convs.len(), 0);
    }
}

