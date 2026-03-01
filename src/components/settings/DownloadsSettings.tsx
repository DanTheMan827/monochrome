export function DownloadsSettings() {
  return (
    <div className="settings-tab-content" id="settings-tab-downloads">
      <div className="settings-list">
        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Zipped Bulk Downloads</span>
              <span className="description">
                Download multiple tracks as a single ZIP file (requires browser support)
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="zipped-bulk-downloads-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Download Lyrics</span>
              <span className="description">Include .lrc files when downloading tracks/albums</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="download-lyrics-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Romaji Lyrics</span>
              <span className="description">Convert Japanese lyrics to Romaji (Latin characters)</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="romaji-lyrics-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Filename Template</span>
              <span className="description">
                Customize download filenames. Available: {'{trackNumber}'}, {'{artist}'}, {'{title}'},{' '}
                {'{album}'}
              </span>
            </div>
            <input
              type="text"
              id="filename-template"
              className="template-input"
              placeholder="{trackNumber} - {artist} - {title}"
            />
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">ZIP Folder Template</span>
              <span className="description">
                Customize album folder names. Available: {'{albumTitle}'}, {'{albumArtist}'}, {'{year}'}
              </span>
            </div>
            <input
              type="text"
              id="zip-folder-template"
              className="template-input"
              placeholder="{albumTitle} - {albumArtist} - monochrome.tf"
            />
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Generate M3U</span>
              <span className="description">Include M3U playlist files in downloads</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="generate-m3u-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Generate M3U8</span>
              <span className="description">Include extended M3U8 playlist files in downloads</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="generate-m3u8-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Generate CUE</span>
              <span className="description">Include CUE sheets for gapless playback in downloads</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="generate-cue-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Generate NFO</span>
              <span className="description">Include NFO files for media center compatibility</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="generate-nfo-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Generate JSON</span>
              <span className="description">Include JSON files with rich metadata</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="generate-json-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Relative Paths</span>
              <span className="description">Use relative paths in playlist files</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="relative-paths-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Separate Discs in ZIP</span>
              <span className="description">
                Put tracks in Disc folders when a release has multiple discs
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="separate-discs-zip-toggle" />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
