mod fetch;

use clap::Parser;

#[derive(Parser, Debug, Clone)]
#[command(author, version, about)]
struct Cli {
    #[arg(short = 'u', long = "url", default_value = "https://monochrome.tf")]
    url: String,
}

const FETCH_SHIM: &str = include_str!("fetch_shim.js");

fn main() {
    let cli = Cli::parse();
    let initial_url = url::Url::parse(&cli.url).expect("invalid --url value");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![fetch::anonymous_fetch])
        .setup(move |app| {
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(initial_url.clone()))
                .title("Monochrome")
                .initialization_script(FETCH_SHIM)
                .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
