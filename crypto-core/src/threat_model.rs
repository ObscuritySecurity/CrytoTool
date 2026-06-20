pub fn get_argon_params(purpose: &str, tier: u32) -> Result<String, String> {
    let params = match (purpose, tier) {
        ("master", 1) | ("recovery", 1) => (2, 19456, 1),
        ("pin", 1) => (2, 32768, 1),
        ("master", 2) | ("recovery", 2) => (3, 65536, 1),
        ("pin", 2) => (3, 65536, 1),
        ("master", 3) | ("recovery", 3) => (10, 131072, 1),
        ("pin", 3) => (10, 131072, 1),
        ("master", 4) | ("recovery", 4) => (19, 262144, 1),
        ("pin", 4) => (19, 262144, 1),
        _ => return Err(format!("Unknown argon purpose/tier: {} / {}", purpose, tier)),
    };
    let result = serde_json::json!({
        "iterations": params.0,
        "memorySize": params.1,
        "parallelism": params.2,
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_master_tier1() {
        let p = get_argon_params("master", 1).unwrap();
        let v: serde_json::Value = serde_json::from_str(&p).unwrap();
        assert_eq!(v["iterations"], 2);
        assert_eq!(v["memorySize"], 19456);
    }

    #[test]
    fn test_master_tier4() {
        let p = get_argon_params("master", 4).unwrap();
        let v: serde_json::Value = serde_json::from_str(&p).unwrap();
        assert_eq!(v["iterations"], 19);
        assert_eq!(v["memorySize"], 262144);
    }

    #[test]
    fn test_pin_tier1() {
        let p = get_argon_params("pin", 1).unwrap();
        let v: serde_json::Value = serde_json::from_str(&p).unwrap();
        assert_eq!(v["iterations"], 2);
        assert_eq!(v["memorySize"], 32768);
    }

    #[test]
    fn test_pin_tier4() {
        let p = get_argon_params("pin", 4).unwrap();
        let v: serde_json::Value = serde_json::from_str(&p).unwrap();
        assert_eq!(v["iterations"], 19);
        assert_eq!(v["memorySize"], 262144);
    }

    #[test]
    fn test_recovery_tier1() {
        let p = get_argon_params("recovery", 1).unwrap();
        assert_eq!(serde_json::from_str::<serde_json::Value>(&p).unwrap()["iterations"], 2);
    }

    #[test]
    fn test_recovery_tier3() {
        let p = get_argon_params("recovery", 3).unwrap();
        assert_eq!(serde_json::from_str::<serde_json::Value>(&p).unwrap()["iterations"], 10);
    }

    #[test]
    fn test_pin_tier1_extra_memory() {
        let p = get_argon_params("pin", 1).unwrap();
        let v: serde_json::Value = serde_json::from_str(&p).unwrap();
        assert!(v["memorySize"].as_u64().unwrap() >= 32768);
    }

    #[test]
    fn test_unknown_purpose() {
        assert!(get_argon_params("unknown", 1).is_err());
    }

    #[test]
    fn test_unknown_tier() {
        assert!(get_argon_params("master", 0).is_err());
        assert!(get_argon_params("master", 5).is_err());
    }
}
