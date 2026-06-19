const SAFE_IMG_SCHEMES: &[&str] = &["http:", "https:", "blob:"];
const SAFE_DATA_IMG_PREFIXES: &[&str] = &[
    "data:image/png",
    "data:image/jpeg",
    "data:image/jpg",
    "data:image/gif",
    "data:image/webp",
    "data:image/avif",
    "data:image/bmp",
    "data:image/x-icon",
];

pub fn is_safe_image_url(url: &str) -> bool {
    if url.is_empty() {
        return false;
    }
    if url.starts_with("blob:") {
        return true;
    }
    if url.starts_with("data:") {
        if url.starts_with("data:image/svg+xml") {
            return false;
        }
        return SAFE_DATA_IMG_PREFIXES.iter().any(|p| url.starts_with(p));
    }
    if let Some(colon_pos) = url.find(':') {
        let protocol = &url[..=colon_pos];
        if protocol == "javascript:" || protocol == "data:" || protocol == "vbscript:" {
            return false;
        }
        return SAFE_IMG_SCHEMES.contains(&protocol);
    }
    false
}

pub fn sanitize_url(url: &str, fallback: &str) -> String {
    if is_safe_image_url(url) {
        url.to_string()
    } else {
        fallback.to_string()
    }
}

pub fn escape_html(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    for ch in text.chars() {
        match ch {
            '&' => result.push_str("&amp;"),
            '<' => result.push_str("&lt;"),
            '>' => result.push_str("&gt;"),
            '"' => result.push_str("&quot;"),
            '\'' => result.push_str("&#39;"),
            c => result.push(c),
        }
    }
    result
}

const DANGEROUS_EXTS: &[&str] = &["svg", "html", "htm", "xhtml", "xml"];

pub fn safe_mime_type_for_ext(ext: &str) -> String {
    let ext = ext.to_lowercase();
    if DANGEROUS_EXTS.contains(&ext.as_str()) {
        "application/octet-stream".to_string()
    } else {
        String::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_safe_image_url_https() {
        assert!(is_safe_image_url("https://example.com/image.png"));
    }

    #[test]
    fn test_is_safe_image_url_blob() {
        assert!(is_safe_image_url("blob:some-uuid-here"));
    }

    #[test]
    fn test_is_safe_image_url_svg_data() {
        assert!(!is_safe_image_url("data:image/svg+xml,<svg></svg>"));
    }

    #[test]
    fn test_is_safe_image_url_javascript() {
        assert!(!is_safe_image_url("javascript:alert(1)"));
    }

    #[test]
    fn test_is_safe_image_url_empty() {
        assert!(!is_safe_image_url(""));
    }

    #[test]
    fn test_is_safe_image_url_data_png() {
        assert!(is_safe_image_url("data:image/png;base64,iVBOR"));
    }

    #[test]
    fn test_sanitize_url_safe() {
        assert_eq!(sanitize_url("https://example.com/img.png", ""), "https://example.com/img.png");
    }

    #[test]
    fn test_sanitize_url_unsafe() {
        assert_eq!(sanitize_url("javascript:alert(1)", "fallback"), "fallback");
    }

    #[test]
    fn test_escape_html() {
        assert_eq!(escape_html("<script>alert('xss')</script>"), "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
        assert_eq!(escape_html("hello & goodbye"), "hello &amp; goodbye");
        assert_eq!(escape_html("normal text"), "normal text");
    }

    #[test]
    fn test_safe_mime_type_for_ext() {
        assert_eq!(safe_mime_type_for_ext("svg"), "application/octet-stream");
        assert_eq!(safe_mime_type_for_ext("SVG"), "application/octet-stream");
        assert_eq!(safe_mime_type_for_ext("html"), "application/octet-stream");
        assert_eq!(safe_mime_type_for_ext("png"), "");
        assert_eq!(safe_mime_type_for_ext("jpg"), "");
    }
}
