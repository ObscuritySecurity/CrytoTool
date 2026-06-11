pub fn get_argon_params(purpose: &str, is_mobile: bool) -> Result<String, String> {
    let (iterations, memory_size, parallelism) = match (purpose, is_mobile) {
        ("pin", _) => (2, 32768, 4),
        ("recovery", true) => (2, 65536, 4),
        ("recovery", false) => (10, 131072, 4),
        ("master", true) => (3, 65536, 4),
        ("master", false) => (19, 131072, 4),
        _ => return Err(format!("Unknown argon purpose: {}", purpose)),
    };
    let result = serde_json::json!({
        "iterations": iterations,
        "memorySize": memory_size,
        "parallelism": parallelism,
    });
    serde_json::to_string(&result).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_argon_params() {
        let master = get_argon_params("master", false).unwrap();
        let v: serde_json::Value = serde_json::from_str(&master).unwrap();
        assert_eq!(v["iterations"], 19);
        assert_eq!(v["memorySize"], 131072);

        let mobile = get_argon_params("master", true).unwrap();
        let vm: serde_json::Value = serde_json::from_str(&mobile).unwrap();
        assert_eq!(vm["iterations"], 3);

        let pin = get_argon_params("pin", false).unwrap();
        let vp: serde_json::Value = serde_json::from_str(&pin).unwrap();
        assert_eq!(vp["iterations"], 2);
    }
}
