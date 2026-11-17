use std::process::Command;

pub struct KeychainService;

impl KeychainService {
    const SERVICE_NAME: &'static str = "com.nova.desktop";

    /// Store a secret in macOS Keychain or secure fallback
    pub fn store_secret(provider: &str, secret: &str) -> Result<(), String> {
        if secret.trim().is_empty() {
            return Err("Secret cannot be empty".to_string());
        }

        #[cfg(target_os = "macos")]
        {
            let status = Command::new("/usr/bin/security")
                .args([
                    "add-generic-password",
                    "-s",
                    Self::SERVICE_NAME,
                    "-a",
                    provider,
                    "-w",
                    secret.trim(),
                    "-U",
                ])
                .output()
                .map_err(|e| format!("Failed to execute security command: {}", e))?;

            if status.status.success() {
                Ok(())
            } else {
                let err = String::from_utf8_lossy(&status.stderr);
                Err(format!("Keychain error: {}", err.trim()))
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            // For non-macOS or test environments, store in memory/fallback file
            std::env::set_var(format!("NOVA_KEY_{}", provider.to_uppercase()), secret.trim());
            Ok(())
        }
    }

    /// Retrieve a secret from macOS Keychain
    pub fn get_secret(provider: &str) -> Result<Option<String>, String> {
        #[cfg(target_os = "macos")]
        {
            let output = Command::new("/usr/bin/security")
                .args([
                    "find-generic-password",
                    "-s",
                    Self::SERVICE_NAME,
                    "-a",
                    provider,
                    "-w",
                ])
                .output()
                .map_err(|e| format!("Failed to execute security command: {}", e))?;

            if output.status.success() {
                let key = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if key.is_empty() {
                    Ok(None)
                } else {
                    Ok(Some(key))
                }
            } else {
                // Item not found in keychain
                Ok(None)
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let var_name = format!("NOVA_KEY_{}", provider.to_uppercase());
            Ok(std::env::var(var_name).ok())
        }
    }

    /// Delete a secret from macOS Keychain
    pub fn delete_secret(provider: &str) -> Result<(), String> {
        #[cfg(target_os = "macos")]
        {
            let output = Command::new("/usr/bin/security")
                .args([
                    "delete-generic-password",
                    "-s",
                    Self::SERVICE_NAME,
                    "-a",
                    provider,
                ])
                .output()
                .map_err(|e| format!("Failed to execute security command: {}", e))?;

            // If it succeeds or item wasn't found, treat as clean deletion
            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.contains("The specified item could not be found") {
                    Ok(())
                } else {
                    Err(format!("Keychain delete error: {}", stderr.trim()))
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let var_name = format!("NOVA_KEY_{}", provider.to_uppercase());
            std::env::remove_var(var_name);
            Ok(())
        }
    }

    /// Check if a secret exists
    pub fn has_secret(provider: &str) -> Result<bool, String> {
        Self::get_secret(provider).map(|opt| opt.is_some())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_crud_lifecycle() {
        let test_provider = "test_nova_provider_lifecycle";
        let test_key = "sk-test-secret-value-12345";

        // 1. Store
        let store_res = KeychainService::store_secret(test_provider, test_key);
        assert!(store_res.is_ok(), "Failed to store secret: {:?}", store_res);

        // 2. Check exists
        let exists = KeychainService::has_secret(test_provider).unwrap();
        assert!(exists, "Expected secret to exist");

        // 3. Retrieve
        let retrieved = KeychainService::get_secret(test_provider).unwrap();
        assert_eq!(retrieved, Some(test_key.to_string()));

        // 4. Delete
        let del_res = KeychainService::delete_secret(test_provider);
        assert!(del_res.is_ok(), "Failed to delete secret: {:?}", del_res);

        // 5. Check no longer exists
        let exists_after = KeychainService::has_secret(test_provider).unwrap();
        assert!(!exists_after, "Secret should no longer exist");
    }
}
