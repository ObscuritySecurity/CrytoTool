use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[cfg(desktop)]
#[derive(Debug, thiserror::Error, Clone, serde::Deserialize)]
pub struct ErrorResponse<T = ()> {
    pub code: Option<String>,
    pub message: Option<String>,
    #[serde(flatten)]
    pub data: T,
}

#[cfg(desktop)]
impl<T> std::fmt::Display for ErrorResponse<T> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let Some(code) = &self.code {
            write!(f, "[{code}]")?;
            if self.message.is_some() {
                write!(f, " - ")?;
            }
        }
        if let Some(message) = &self.message {
            write!(f, "{message}")?;
        }
        Ok(())
    }
}

#[cfg(desktop)]
#[derive(Debug, thiserror::Error)]
pub enum PluginInvokeError {
    #[error(transparent)]
    InvokeRejected(#[from] ErrorResponse),
    #[error("failed to deserialize response: {0}")]
    CannotDeserializeResponse(serde_json::Error),
    #[error("failed to serialize payload: {0}")]
    CannotSerializePayload(serde_json::Error),
}

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[cfg(mobile)]
    #[error(transparent)]
    PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
    #[cfg(desktop)]
    #[error(transparent)]
    PluginInvoke(#[from] crate::error::PluginInvokeError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
