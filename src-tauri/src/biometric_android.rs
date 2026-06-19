use tauri::AppHandle;

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
pub(crate) const TIMEOUT_SECONDS: i64 = 30;

#[tauri::command]
pub fn check_biometric_available(app: AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let ctx = app.android_context();
        let mut env = ctx
            .0
            .get_env()
            .map_err(|e| format!("Failed to get JNI env: {}", e))?;
        let activity = ctx.0.activity();
        let context = JValue::Object(&activity);

        let cls = env
            .find_class("com/crytotool/vault/BiometricHelper")
            .map_err(|e| format!("Class not found: {}", e))?;

        let available = env
            .call_static_method(
                cls,
                "isAvailable",
                "(Landroid/content/Context;)Z",
                &[context],
            )
            .map_err(|e| format!("Failed to call isAvailable: {}", e))?
            .z()
            .map_err(|e| format!("Failed to get boolean: {}", e))?;

        Ok(available)
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(false)
    }
}

#[tauri::command]
pub fn authenticate_biometric(
    app: AppHandle,
    reason: String,
) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        let ctx = app.android_context();
        let mut env = ctx
            .0
            .get_env()
            .map_err(|e| format!("Failed to get JNI env: {}", e))?;
        let activity = ctx.0.activity();
        let jreason = env
            .new_string(&reason)
            .map_err(|e| format!("Failed to create string: {}", e))?;

        let cls = env
            .find_class("com/crytotool/vault/BiometricHelper")
            .map_err(|e| format!("Class not found: {}", e))?;

        let authenticated = env
            .call_static_method(
                cls,
                "authenticate",
                "(Landroid/app/Activity;Ljava/lang/String;J)Z",
                &[
                    JValue::Object(&activity),
                    JValue::Object(&jreason.into()),
                    JValue::Long(TIMEOUT_SECONDS),
                ],
            )
            .map_err(|e| format!("Failed to call authenticate: {}", e))?
            .z()
            .map_err(|e| format!("Failed to get boolean: {}", e))?;

        Ok(authenticated)
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = reason;
        Ok(false)
    }
}
