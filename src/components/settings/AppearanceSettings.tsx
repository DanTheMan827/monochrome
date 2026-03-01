export function AppearanceSettings() {
  return (
    <div className="settings-tab-content active" id="settings-tab-appearance">
      <div className="settings-list">
        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Theme</span>
              <span className="description">Choose your preferred color scheme</span>
            </div>
          </div>
          <div className="theme-picker" id="theme-picker">
            <div className="theme-option" data-theme="system">System</div>
            <div className="theme-option" data-theme="monochrome">Black</div>
            <div className="theme-option" data-theme="white">White</div>
            <div className="theme-option" data-theme="dark">Dark</div>
            <div className="theme-option" data-theme="ocean">Ocean</div>
            <div className="theme-option" data-theme="purple">Purple</div>
            <div className="theme-option" data-theme="forest">Forest</div>
            <div className="theme-option" data-theme="mocha">Mocha</div>
            <div className="theme-option" data-theme="machiatto">Macchiato</div>
            <div className="theme-option" data-theme="frappe">Frappé</div>
            <div className="theme-option" data-theme="latte">Latte</div>
            <div className="theme-option" data-theme="custom">Custom</div>
          </div>
          <div id="applied-community-theme-container" style={{ display: 'none', marginTop: '1rem' }}>
            <button
              id="applied-community-theme-btn"
              className="btn-secondary"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem',
              }}
            >
              <span>Applied Community Theme</span>
              <span
                id="applied-theme-name"
                style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}
              ></span>
            </button>
            <div
              id="community-theme-details-panel"
              style={{
                display: 'none',
                padding: '1rem',
                background: 'var(--secondary)',
                borderRadius: 'var(--radius)',
                marginTop: '0.5rem',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{ marginBottom: '0.5rem', fontWeight: 600 }}
                id="ct-details-title"
              ></div>
              <div
                style={{
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: 'var(--muted-foreground)',
                }}
                id="ct-details-author"
              ></div>
              <button id="ct-unapply-btn" className="btn-secondary danger" style={{ width: '100%' }}>
                Unapply Theme
              </button>
            </div>
          </div>
          <div className="custom-theme-editor" id="custom-theme-editor">
            <h4>Custom Theme</h4>
            <div className="theme-color-grid" id="theme-color-grid"></div>
            <div className="theme-actions">
              <button className="btn-secondary" id="apply-custom-theme">Apply Theme</button>
              <button className="btn-secondary" id="reset-custom-theme">Reset</button>
            </div>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Community Themes</span>
              <span className="description">Browse and apply themes created by the community</span>
            </div>
            <button id="open-theme-store-btn" className="btn-secondary">Open Theme Store</button>
          </div>
          <div className="setting-item font-settings-container">
            <div className="info">
              <span className="label">Font</span>
              <span className="description">Choose from presets, Google Fonts, URLs, or upload your own</span>
            </div>
            <div className="font-input-group">
              <select id="font-type-select" className="font-type-select">
                <option value="preset">Preset</option>
                <option value="google">Google Fonts</option>
                <option value="url">URL</option>
                <option value="upload">Upload</option>
              </select>

              <div id="font-preset-section" className="font-section">
                <select id="font-preset-select">
                  <option value="Inter">Inter (Default)</option>
                  <option value="Apple Music">Apple Music</option>
                  <option value="IBM Plex Mono">IBM Plex Mono</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                  <option value="System UI">System UI</option>
                  <option value="monospace">Monospace</option>
                </select>
              </div>

              <div id="font-google-section" className="font-section" style={{ display: 'none' }}>
                <input
                  type="text"
                  id="font-google-input"
                  placeholder="Enter Google Fonts URL or font name (e.g., IBM Plex Mono)"
                  className="font-input"
                />
                <button id="font-google-apply" className="btn-secondary">Apply</button>
              </div>

              <div id="font-url-section" className="font-section" style={{ display: 'none' }}>
                <input
                  type="text"
                  id="font-url-input"
                  placeholder="Enter font file URL (.woff, .woff2, .ttf, .otf)"
                  className="font-input"
                />
                <input
                  type="text"
                  id="font-url-name"
                  placeholder="Font name (optional)"
                  className="font-input font-name-input"
                />
                <button id="font-url-apply" className="btn-secondary">Apply</button>
              </div>

              <div id="font-upload-section" className="font-section" style={{ display: 'none' }}>
                <input
                  type="file"
                  id="font-upload-input"
                  accept=".woff,.woff2,.ttf,.otf"
                  className="font-file-input"
                />
                <div id="uploaded-fonts-list" className="uploaded-fonts-list"></div>
              </div>
            </div>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Font Size</span>
              <span className="description">Adjust the base font size (50% - 200%)</span>
            </div>
            <div className="font-size-control">
              <input
                type="range"
                id="font-size-slider"
                min="50"
                max="200"
                value="100"
                step="5"
                className="font-size-slider"
              />
              <input
                type="number"
                id="font-size-input"
                min="50"
                max="200"
                value="100"
                step="1"
                className="font-size-number-input"
                title="Enter font size percentage"
              />
              <span className="font-size-unit">%</span>
              <button id="font-size-reset" className="btn-secondary" title="Reset to default">
                Reset
              </button>
            </div>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Waveform Seekbar</span>
              <span className="description">
                Show a visual waveform of the track in the progress bar (Experimental)
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="waveform-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Smooth Scrolling</span>
              <span className="description">
                Provides a smoother scrolling experience with Lenis (Experimental)
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="smooth-scrolling-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Album Cover Background</span>
              <span className="description">
                Use the album cover as a blurred background on album pages and as primary color
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="album-background-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Dynamic Colors</span>
              <span className="description">
                Automatically change the app accent color based on the currently playing track&apos;s album art
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="dynamic-color-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Full-screen Visualizer</span>
              <span className="description">Enable particle visualizer in full-screen mode</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="visualizer-enabled-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item" id="visualizer-preset-setting">
            <div className="info">
              <span className="label">Visualizer Style</span>
              <span className="description">Select the visualization style</span>
            </div>
            <select id="visualizer-preset-select">
              <option value="lcd">LCD Pixels</option>
              <option value="particles">Particles</option>
              <option value="unknown-pleasures">Unknown Pleasures</option>
              <option value="butterchurn">Butterchurn (Milkdrop)</option>
            </select>
          </div>
          <div className="setting-item" id="visualizer-mode-setting">
            <div className="info">
              <span className="label">Visualizer Mode</span>
              <span className="description">Choose how the visualizer is displayed in full-screen</span>
            </div>
            <select id="visualizer-mode-select">
              <option value="solid">Solid Background</option>
              <option value="blended">Blended on Cover Art</option>
            </select>
          </div>
          <div className="setting-item" id="visualizer-smart-intensity-setting">
            <div className="info">
              <span className="label">Smart Intensity Switching</span>
              <span className="description">
                Automatically adjust visualizer intensity based on song energy
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="smart-intensity-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item" id="visualizer-sensitivity-setting">
            <div className="info">
              <span className="label">Visualizer Sensitivity</span>
              <span className="description">
                Adjust the intensity of the visualizer effects.{' '}
                <strong>
                  Warning: High sensitivity may cause flashing lights and rapid motion, which can trigger
                  seizures in people with photosensitive epilepsy.
                </strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                id="visualizer-sensitivity-slider"
                min="0.1"
                max="2.0"
                step="0.1"
                defaultValue="0.6"
                style={{ width: '100px' }}
              />
              <span
                id="visualizer-sensitivity-value"
                style={{ fontSize: '0.9rem', minWidth: '3em', textAlign: 'right' }}
              >
                60%
              </span>
            </div>
          </div>

          {/* Butterchurn Settings */}
          <div className="setting-item" id="butterchurn-cycle-setting" style={{ display: 'none' }}>
            <div className="info">
              <span className="label">Cycle Presets</span>
              <span className="description">Automatically change visualizer presets</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="butterchurn-cycle-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div
            className="setting-item"
            id="butterchurn-specific-preset-setting"
            style={{ display: 'none' }}
          >
            <div className="info">
              <span className="label">Current Preset</span>
              <span className="description">Select a specific Butterchurn preset</span>
            </div>
            <select id="butterchurn-specific-preset-select" style={{ width: '200px' }}>
              <option value="">Loading...</option>
            </select>
          </div>
          <div className="setting-item" id="butterchurn-duration-setting" style={{ display: 'none' }}>
            <div className="info">
              <span className="label">Cycle Duration</span>
              <span className="description">Seconds between preset changes</span>
            </div>
            <input
              type="number"
              id="butterchurn-duration-input"
              min="5"
              max="300"
              defaultValue="30"
              className="template-input"
              style={{ width: '80px' }}
            />
          </div>
          <div className="setting-item" id="butterchurn-randomize-setting" style={{ display: 'none' }}>
            <div className="info">
              <span className="label">Randomize Presets</span>
              <span className="description">Select next preset randomly instead of sequentially</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="butterchurn-randomize-toggle" />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
