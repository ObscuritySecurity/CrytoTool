const COMMANDS: &[&str] = &[
    "authenticate",
    "status",
    "has_data",
    "get_data",
    "set_data",
    "remove_data",
];

fn main() {
    let result = tauri_plugin::Builder::new(COMMANDS)
        .android_path("android")
        .ios_path("ios")
        .try_build();

    if !(cfg!(docsrs) && std::env::var("TARGET").unwrap().contains("android")) {
        result.unwrap();
    }
}
