use clap::Parser;

#[derive(Parser, Debug, Clone)]
#[command(author, version, about)]
struct Cli {
    #[arg(short = 'u', long = "url", default_value = "https://monochrome.tf")]
    url: String,
}

fn main() {
    let cli = Cli::parse();
    let initial_url = url::Url::parse(&cli.url).expect("invalid --url value");

    tauri::Builder::default()
        .setup(move |app| {
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(initial_url.clone()))
                .title("Monochrome")
                .devtools(true)
                .build()?;

            Ok(())
        })
        .plugin(tauri_plugin_cors_fetch::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
