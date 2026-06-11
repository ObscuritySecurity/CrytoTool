use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthOptions {
    pub allow_device_credential: Option<bool>,
    pub cancel_title: Option<String>,
    pub fallback_title: Option<String>,
    pub title: Option<String>,
    pub subtitle: Option<String>,
    pub confirmation_required: Option<bool>,
}

#[derive(Serialize)]
pub struct AuthenticatePayload {
    pub reason: String,
    #[serde(flatten)]
    pub options: AuthOptions,
}

#[derive(Debug, Clone, serde_repr::Deserialize_repr, serde_repr::Serialize_repr)]
#[repr(u8)]
pub enum BiometryType {
    None = 0,
    Auto = 1,
    TouchID = 2,
    FaceID = 3,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub is_available: bool,
    pub biometry_type: BiometryType,
    pub error: Option<String>,
    pub error_code: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HasDataResponse {
    pub has_data: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataOptions {
    pub domain: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DataResponse {
    pub domain: String,
    pub name: String,
    pub data: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDataOptions {
    pub domain: String,
    pub name: String,
    pub reason: String,
    pub cancel_title: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetDataOptions {
    pub domain: String,
    pub name: String,
    pub data: String,
}

pub type RemoveDataOptions = DataOptions;
