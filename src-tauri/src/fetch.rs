use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<BTreeMap<String, String>>,
    pub body_base64: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchResponse {
    pub url: String,
    pub status: u16,
    pub status_text: String,
    pub headers: BTreeMap<String, String>,
    pub body_base64: String,
}

fn strip_forbidden_header(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    lower == "origin" || lower == "referer" || lower == "referrer"
}

async fn send_anonymous_fetch(
    request: FetchRequest,
) -> Result<FetchResponse, Box<dyn std::error::Error + Send + Sync>> {
    let method = request
        .method
        .as_deref()
        .unwrap_or("GET")
        .parse::<Method>()?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()?;

    let mut request_builder = client.request(method, &request.url);

    if let Some(headers) = request.headers {
        let mut header_map = HeaderMap::new();

        for (name, value) in headers {
            if strip_forbidden_header(&name) {
                continue;
            }

            let header_name = HeaderName::from_bytes(name.as_bytes())?;
            let header_value = HeaderValue::from_str(&value)?;
            header_map.append(header_name, header_value);
        }

        request_builder = request_builder.headers(header_map);
    }

    if let Some(body_base64) = request.body_base64 {
        let body = STANDARD.decode(body_base64.as_bytes())?;
        request_builder = request_builder.body(body);
    }

    let response = request_builder.send().await?;
    let final_url = response.url().to_string();
    let status = response.status();
    let status_text = status
        .canonical_reason()
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| status.to_string());

    let mut headers = BTreeMap::new();

    for (name, value) in response.headers() {
        if let Ok(value_str) = value.to_str() {
            headers
                .entry(name.as_str().to_owned())
                .and_modify(|existing: &mut String| {
                    existing.push_str(", ");
                    existing.push_str(value_str);
                })
                .or_insert_with(|| value_str.to_owned());
        }
    }

    let body = response.bytes().await?;

    Ok(FetchResponse {
        url: final_url,
        status: status.as_u16(),
        status_text,
        headers,
        body_base64: STANDARD.encode(body),
    })
}

#[tauri::command]
pub async fn anonymous_fetch(request: FetchRequest) -> Result<FetchResponse, String> {
    send_anonymous_fetch(request)
        .await
        .map_err(|error| format!("anonymous fetch failed: {error}"))
}

#[cfg(test)]
mod tests {
    use super::{send_anonymous_fetch, FetchRequest};
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use std::collections::BTreeMap;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;

    async fn spawn_test_server() -> (String, tokio::sync::oneshot::Receiver<String>) {
        let listener = TcpListener::bind("127.0.0.1:0").await.expect("bind server");
        let address = listener.local_addr().expect("local addr");
        let (tx, rx) = tokio::sync::oneshot::channel();

        tokio::spawn(async move {
            let (mut stream, _) = listener.accept().await.expect("accept connection");

            let mut buffer = vec![0_u8; 8192];
            let size = stream.read(&mut buffer).await.expect("read request");
            let request = String::from_utf8_lossy(&buffer[..size]).to_string();
            let _ = tx.send(request);

            let response = b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 2\r\n\r\nok";
            stream
                .write_all(response)
                .await
                .expect("write response");
        });

        (format!("http://{address}/echo"), rx)
    }

    #[tokio::test]
    async fn removes_origin_and_referrer_headers() {
        let (url, request_rx) = spawn_test_server().await;

        let mut headers = BTreeMap::new();
        headers.insert("origin".to_string(), "https://tidal.com".to_string());
        headers.insert("referer".to_string(), "https://tidal.com/".to_string());
        headers.insert("x-test-header".to_string(), "kept".to_string());

        let response = send_anonymous_fetch(FetchRequest {
            url,
            method: Some("POST".to_string()),
            headers: Some(headers),
            body_base64: Some(STANDARD.encode("payload")),
        })
        .await
        .expect("anonymous fetch request should succeed");

        let raw_request = request_rx.await.expect("capture request").to_ascii_lowercase();

        assert!(!raw_request.contains("\norigin:"));
        assert!(!raw_request.contains("\nreferer:"));
        assert!(!raw_request.contains("\nreferrer:"));
        assert!(raw_request.contains("\nx-test-header: kept"));
        assert_eq!(response.status, 200);
        assert_eq!(STANDARD.decode(response.body_base64).expect("decode body"), b"ok");
    }
}
