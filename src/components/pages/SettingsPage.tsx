export function SettingsPage() {
  return (
    <div id="page-settings" className="page">
      <h2 className="section-title">Settings</h2>
      <form
        className="track-list-search-container settings-search-container"
        onSubmit={(e) => e.preventDefault()}
        style={{ margin: '1rem 0' }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="search-icon"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          id="settings-search-input"
          placeholder="Search settings..."
          className="track-list-search-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="search-clear-btn btn-icon"
          title="Clear search"
          style={{ display: 'none' }}
        >
          ×
        </button>
      </form>
      <div className="settings-tabs">
        <button className="settings-tab active" data-tab="appearance">Appearance</button>
        <button className="settings-tab" data-tab="interface">Interface</button>
        <button className="settings-tab" data-tab="scrobbling">Scrobbling</button>
        <button className="settings-tab" data-tab="audio">Audio</button>
        <button className="settings-tab" data-tab="downloads">Downloads</button>
        <button className="settings-tab" data-tab="system">System</button>
      </div>

      {/* Appearance Tab */}
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
              <div className="theme-option" data-theme="machiatto">Machiatto</div>
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

      {/* Interface Tab */}
      <div className="settings-tab-content" id="settings-tab-interface">
        <div className="settings-list">
          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Recommended Songs</span>
                <span className="description">Display recommended songs on the home page</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="show-recommended-songs-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Recommended Albums</span>
                <span className="description">Display recommended albums on the home page</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="show-recommended-albums-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Recommended Artists</span>
                <span className="description">Display recommended artists on the home page</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="show-recommended-artists-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Jump Back In</span>
                <span className="description">
                  Display recent albums, playlists, and mixes on the home page
                </span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="show-jump-back-in-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Editor&apos;s Picks</span>
                <span className="description">Display curated album selections on the home page</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="show-editors-picks-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Shuffle Editor&apos;s Picks</span>
                <span className="description">Randomize the order of editor&apos;s picks on each load</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="shuffle-editors-picks-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-group" id="sidebar-order-settings-group">
            <div className="sidebar-settings-section sidebar-settings-main">
              <span className="sidebar-settings-section-label">TOP SECTION</span>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Home in Sidebar</span>
                  <span className="description">Display the Home link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-home-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Library in Sidebar</span>
                  <span className="description">Display the Library link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-library-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Recent in Sidebar</span>
                  <span className="description">Display the Recent link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-recent-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Unreleased in Sidebar</span>
                  <span className="description">Display the Unreleased link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-unreleased-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Donate in Sidebar</span>
                  <span className="description">Display the Donate link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-donate-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Settings in Sidebar</span>
                  <span className="description">Display the Settings link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-settings-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
            <div className="sidebar-settings-section sidebar-settings-bottom">
              <span className="sidebar-settings-section-label">BOTTOM SECTION</span>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show About in Sidebar</span>
                  <span className="description">Display the About link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-about-bottom-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Download in Sidebar</span>
                  <span className="description">Display the Download link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-download-bottom-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <div className="info">
                  <span className="label">Show Discord in Sidebar</span>
                  <span className="description">Display the Discord link in the sidebar navigation</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" id="sidebar-show-discordbtn-toggle" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Close Modals on Navigation</span>
                <span className="description">
                  Close open modals and panels (like lyrics, queue) when navigating back or to a new page
                </span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="close-modals-on-navigation-toggle" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Intercept Back to Close Modals</span>
                <span className="description">
                  When pressing back, close open modals/panels first without navigating. Press back again to
                  actually go back.
                </span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="intercept-back-to-close-modals-toggle" />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Scrobbling Tab */}
      <div className="settings-tab-content" id="settings-tab-scrobbling">
        <div className="settings-list">
          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Scrobble Threshold</span>
                <span className="description">Percentage of track to play before scrobbling (1-100%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range"
                  id="scrobble-percentage-slider"
                  min="1"
                  max="100"
                  step="1"
                  defaultValue="75"
                  style={{ width: '100px' }}
                />
                <input
                  type="number"
                  id="scrobble-percentage-input"
                  min="1"
                  max="100"
                  defaultValue="75"
                  style={{
                    width: '50px',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    padding: '4px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    background: 'var(--input-bg)',
                    color: 'var(--text-color)',
                  }}
                />
                <span style={{ fontSize: '0.9rem' }}>%</span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Last.fm Scrobbling</span>
                <span className="description" id="lastfm-status">
                  Connect your Last.fm account to scrobble tracks
                </span>
              </div>
              <div id="lastfm-controls">
                <button id="lastfm-connect-btn" className="btn-secondary">Connect Last.fm</button>
              </div>
              <div id="lastfm-credential-auth" style={{ display: 'none', marginTop: '12px' }}>
                <div id="lastfm-credential-form" style={{ display: 'none' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                    Enter your Last.fm credentials:
                  </p>
                  <input
                    type="text"
                    id="lastfm-username"
                    placeholder="Username"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  />
                  <input
                    type="password"
                    id="lastfm-password"
                    placeholder="Password"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                      width: '100%',
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id="lastfm-login-credentials"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                    >
                      Login
                    </button>
                    <button
                      id="lastfm-use-oauth"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                    >
                      Use OAuth Instead
                    </button>
                  </div>
                </div>
              </div>
              <div id="lastfm-credential-auth-secondary" style={{ display: 'none', marginTop: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div id="lastfm-credential-toggle-container-secondary">
                    <button
                      id="lastfm-show-credential-auth-secondary"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', width: '100%' }}
                    >
                      Login with Username/Password
                    </button>
                  </div>
                  <div id="lastfm-credential-form-secondary" style={{ display: 'none' }}>
                    <input
                      type="text"
                      id="lastfm-username-secondary"
                      placeholder="Last.fm Username"
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    />
                    <input
                      type="password"
                      id="lastfm-password-secondary"
                      placeholder="Last.fm Password"
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--foreground)',
                        width: '100%',
                        marginBottom: '8px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        id="lastfm-login-credentials-secondary"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                      >
                        Login
                      </button>
                      <button
                        id="lastfm-use-oauth-secondary"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                      >
                        Use OAuth
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div id="lastfm-credential-auth-alt" style={{ marginTop: '12px', display: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    id="lastfm-username-alt"
                    placeholder="Last.fm Username"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <input
                    type="password"
                    id="lastfm-password-alt"
                    placeholder="Last.fm Password"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      id="lastfm-login-credentials-alt"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Login with Credentials
                    </button>
                    <button
                      id="lastfm-use-oauth-alt"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Use OAuth Instead
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      id="lastfm-show-credential-auth-alt"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Login with Username/Password
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="setting-item" id="lastfm-toggle-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">Enable Scrobbling</span>
                <span className="description">Automatically scrobble played tracks</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="lastfm-toggle" />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item" id="lastfm-love-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">Love on Like</span>
                <span className="description">
                  Automatically &apos;love&apos; tracks on Last.fm when you like them
                </span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="lastfm-love-toggle" />
                <span className="slider"></span>
              </label>
            </div>

            <div
              className="setting-item"
              id="lastfm-custom-creds-toggle-setting"
              style={{ display: 'none' }}
            >
              <div className="info">
                <span className="label">Use Custom API Credentials</span>
                <span className="description">Use your own Last.fm API key and secret</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="lastfm-custom-creds-toggle" />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item" id="lastfm-custom-creds-setting" style={{ display: 'none' }}>
              <div className="info" style={{ flex: 1, minWidth: 0 }}>
                <span className="label">Custom API Credentials</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    id="lastfm-custom-api-key"
                    placeholder="API Key"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <input
                    type="password"
                    id="lastfm-custom-api-secret"
                    placeholder="API Secret"
                    style={{
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      id="lastfm-save-custom-creds"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      Save Credentials
                    </button>
                    <button
                      id="lastfm-clear-custom-creds"
                      className="btn-secondary danger"
                      style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'none' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Libre.fm Scrobbling</span>
                <span className="description" id="librefm-status">
                  Connect your Libre.fm account to scrobble tracks
                </span>
              </div>
              <div id="librefm-controls">
                <button id="librefm-connect-btn" className="btn-secondary">Connect Libre.fm</button>
              </div>
            </div>

            <div className="setting-item" id="librefm-toggle-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">Enable Scrobbling</span>
                <span className="description">Automatically scrobble played tracks</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="librefm-toggle" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item" id="librefm-love-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">Love on Like</span>
                <span className="description">
                  Automatically &apos;love&apos; tracks on Libre.fm when you like them
                </span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="librefm-love-toggle" />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">ListenBrainz Scrobbling</span>
                <span className="description">Submit listens to ListenBrainz (requires User Token)</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="listenbrainz-enabled-toggle" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item" id="listenbrainz-token-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">User Token</span>
                <span className="description">Found on your ListenBrainz profile page</span>
              </div>
              <input
                type="password"
                id="listenbrainz-token-input"
                placeholder="Enter Token"
                className="template-input"
                style={{ width: '250px' }}
              />
            </div>
            <div className="setting-item" id="listenbrainz-custom-url-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">Custom API URL (Optional)</span>
                <span className="description">Leave empty to use official ListenBrainz server</span>
              </div>
              <input
                type="url"
                id="listenbrainz-custom-url-input"
                placeholder="https://api.listenbrainz.org/1"
                className="template-input"
                style={{ width: '250px' }}
              />
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Maloja Scrobbling</span>
                <span className="description">Submit listens to a self-hosted Maloja server</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="maloja-enabled-toggle" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item" id="maloja-token-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">API Key</span>
                <span className="description">Found in your Maloja settings</span>
              </div>
              <input
                type="password"
                id="maloja-token-input"
                placeholder="Enter API Key"
                className="template-input"
                style={{ width: '250px' }}
              />
            </div>
            <div className="setting-item" id="maloja-custom-url-setting" style={{ display: 'none' }}>
              <div className="info">
                <span className="label">Maloja Server URL</span>
                <span className="description">Your Maloja instance URL</span>
              </div>
              <input
                type="url"
                id="maloja-custom-url-input"
                placeholder="https://maloja.example.com"
                className="template-input"
                style={{ width: '250px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audio Tab */}
      <div className="settings-tab-content" id="settings-tab-audio">
        <div className="settings-list">
          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Music Provider</span>
                <span className="description">Default service for searching and streaming</span>
              </div>
              <select id="music-provider-setting">
                <option value="tidal">Tidal</option>
                <option value="qobuz">Qobuz</option>
              </select>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Streaming Quality</span>
                <span className="description">Quality for streaming playback</span>
              </div>
              <select id="streaming-quality-setting">
                <option value="HI_RES_LOSSLESS">Hi-Res FLAC (24-bit)</option>
                <option value="LOSSLESS">FLAC (Lossless)</option>
                <option value="HIGH">AAC 320kbps</option>
                <option value="LOW">AAC 96kbps</option>
              </select>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Download Quality</span>
                <span className="description">Quality for track downloads</span>
              </div>
              <select id="download-quality-setting">
                <option value="HI_RES_LOSSLESS">Hi-Res FLAC (24-bit)</option>
                <option value="LOSSLESS">FLAC (Lossless)</option>
                <option value="MP3_320">MP3 320kbps</option>
                <option value="HIGH">AAC 320kbps</option>
                <option value="LOW">AAC 96kbps</option>
              </select>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Lossless Container</span>
                <span className="description">Container format for lossless downloads</span>
              </div>
              <select id="lossless-container-setting">
                <option value="flac">FLAC</option>
                <option value="alac">Apple Lossless</option>
                <option value="nochange">Don&apos;t change</option>
              </select>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Cover Art Size</span>
                <span className="description">Size for downloaded/embedded cover art</span>
              </div>
              <input
                type="text"
                id="cover-art-size-setting"
                className="template-input"
                style={{ width: '120px', textAlign: 'right' }}
                placeholder="1280x1280"
              />
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Quality Badges</span>
                <span className="description">Display &quot;HD&quot; badge for Hi-Res tracks</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="show-quality-badges-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Album release year</span>
                <span className="description">Show original album year instead of track/remaster date</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="use-album-release-year-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Gapless Playback</span>
                <span className="description">Play audio without interruption between tracks</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">ReplayGain Mode</span>
                <span className="description">Normalize volume across tracks</span>
              </div>
              <select id="replay-gain-mode">
                <option value="off">Off</option>
                <option value="track">Track</option>
                <option value="album">Album</option>
              </select>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">ReplayGain Pre-Amp</span>
                <span className="description">Adjust gain manually (dB)</span>
              </div>
              <input
                type="number"
                id="replay-gain-preamp"
                defaultValue="3"
                step="0.5"
                style={{ width: '80px' }}
              />
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Mono Audio</span>
                <span className="description">Combine left and right channels into mono</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="mono-audio-toggle" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Exponential Volume</span>
                <span className="description">Use logarithmic volume curve for finer low-volume control</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="exponential-volume-toggle" />
                <span className="slider"></span>
              </label>
            </div>

            {/* Playback Speed Control */}
            <div className="setting-item">
              <div className="info">
                <span className="label">Playback Speed</span>
                <span className="description">Adjust playback speed (0.01x - 100x)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  id="playback-speed-slider"
                  min="0.25"
                  max="4.0"
                  step="0.01"
                  defaultValue="1.0"
                  style={{ width: '150px' }}
                />
                <input
                  type="number"
                  id="playback-speed-input"
                  min="0.01"
                  max="100"
                  step="0.01"
                  defaultValue="1.0"
                  style={{
                    width: '80px',
                    textAlign: 'center',
                    fontFamily: 'var(--font-family)',
                    padding: '4px 8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-family)' }}>x</span>
              </div>
            </div>

            {/* 16-Band Equalizer */}
            <div className="setting-item">
              <div className="info">
                <span className="label">Equalizer</span>
                <span className="description">16-band parametric equalizer for fine audio control</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="equalizer-enabled-toggle" />
                <span className="slider"></span>
              </label>
            </div>

            <div className="equalizer-container" id="equalizer-container" style={{ display: 'none' }}>
              <div className="equalizer-header">
                <div className="equalizer-preset-row">
                  <label htmlFor="equalizer-preset-select">Preset</label>
                  <select id="equalizer-preset-select">
                    <optgroup label="Built-in Presets">
                      <option value="flat">Flat</option>
                      <option value="bass_boost">Bass Boost</option>
                      <option value="bass_reducer">Bass Reducer</option>
                      <option value="treble_boost">Treble Boost</option>
                      <option value="treble_reducer">Treble Reducer</option>
                      <option value="vocal_boost">Vocal Boost</option>
                      <option value="loudness">Loudness</option>
                      <option value="rock">Rock</option>
                      <option value="pop">Pop</option>
                      <option value="classical">Classical</option>
                      <option value="jazz">Jazz</option>
                      <option value="electronic">Electronic</option>
                      <option value="hip_hop">Hip-Hop</option>
                      <option value="r_and_b">R&amp;B</option>
                      <option value="acoustic">Acoustic</option>
                      <option value="podcast">Podcast / Speech</option>
                    </optgroup>
                    <optgroup label="Custom Presets" id="custom-presets-optgroup">
                      {/* Custom presets will be populated by JavaScript */}
                    </optgroup>
                  </select>
                  <label htmlFor="eq-band-count">Bands</label>
                  <input
                    type="number"
                    id="eq-band-count"
                    className="eq-band-count-input"
                    min="3"
                    max="32"
                    defaultValue="16"
                    title="Number of EQ bands (3-32)"
                  />
                  <button
                    id="equalizer-reset-btn"
                    className="btn-secondary"
                    title="Reset to Flat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                  <button
                    id="eq-export-btn"
                    className="btn-secondary"
                    title="Export EQ settings to text"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Export
                  </button>
                  <button
                    id="eq-import-btn"
                    className="btn-secondary"
                    title="Import EQ settings from text or file"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  >
                    Import
                  </button>
                  <input
                    type="file"
                    id="eq-import-file"
                    accept=".txt"
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="custom-preset-controls">
                  <div className="custom-preset-input-row">
                    <input
                      type="text"
                      id="custom-preset-name"
                      placeholder="Preset name (e.g., Home, Car, Work)"
                      maxLength={50}
                    />
                    <button
                      id="save-custom-preset-btn"
                      className="btn-primary"
                      title="Save current EQ as custom preset"
                    >
                      Save
                    </button>
                  </div>
                  <button
                    id="delete-custom-preset-btn"
                    className="btn-secondary delete-preset-btn"
                    style={{ display: 'none' }}
                    title="Delete selected custom preset"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path
                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      />
                    </svg>
                    Delete Preset
                  </button>
                </div>

                <div className="eq-range-controls">
                  <label>DB Range:</label>
                  <input
                    type="number"
                    id="eq-range-min"
                    className="eq-range-input"
                    min="-60"
                    max="0"
                    defaultValue="-30"
                    title="Minimum gain in dB"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    id="eq-range-max"
                    className="eq-range-input"
                    min="0"
                    max="60"
                    defaultValue="30"
                    title="Maximum gain in dB"
                  />
                  <span>dB</span>
                  <button
                    id="apply-eq-range-btn"
                    className="btn-secondary"
                    title="Apply new range to all bands"
                  >
                    Apply
                  </button>
                  <button
                    id="reset-eq-range-btn"
                    className="btn-secondary"
                    title="Reset to default (-30 to +30 dB)"
                  >
                    Reset
                  </button>
                </div>

                <div className="eq-freq-controls">
                  <label>Freq Range:</label>
                  <input
                    type="number"
                    id="eq-freq-min"
                    className="eq-freq-input"
                    min="10"
                    max="20000"
                    defaultValue="20"
                    title="Minimum frequency in Hz"
                  />
                  <span>Hz to</span>
                  <input
                    type="number"
                    id="eq-freq-max"
                    className="eq-freq-input"
                    min="20"
                    max="96000"
                    defaultValue="20000"
                    title="Maximum frequency in Hz"
                  />
                  <span>Hz</span>
                  <button
                    id="apply-eq-freq-btn"
                    className="btn-secondary"
                    title="Apply new frequency range"
                  >
                    Apply
                  </button>
                  <button
                    id="reset-eq-freq-btn"
                    className="btn-secondary"
                    title="Reset to default (20 Hz to 20 kHz)"
                  >
                    Reset
                  </button>
                </div>

                <div
                  className="eq-preamp-controls"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                >
                  <label style={{ fontSize: '0.75rem', opacity: 0.8 }}>Preamp:</label>
                  <input
                    type="range"
                    id="eq-preamp-slider"
                    min="-20"
                    max="20"
                    step="0.1"
                    defaultValue="0"
                    style={{ flex: 1, maxWidth: '120px' }}
                    title="Preamp gain in dB"
                  />
                  <input
                    type="number"
                    id="eq-preamp-input"
                    min="-20"
                    max="20"
                    step="0.1"
                    defaultValue="0"
                    style={{ width: '60px', padding: '0.25rem', fontSize: '0.75rem' }}
                    title="Preamp value in dB"
                  />
                  <span style={{ fontSize: '0.75rem' }}>dB</span>
                </div>
              </div>

              <div className="equalizer-bands-wrapper">
                <canvas id="eq-response-canvas" className="eq-response-canvas"></canvas>
                <div className="equalizer-bands" id="equalizer-bands">
                  {/* Bands will be dynamically generated by JavaScript */}
                </div>
              </div>

              <div className="equalizer-scale">
                <span>+30 dB</span>
                <span>0 dB</span>
                <span>-30 dB</span>
              </div>
            </div>
          </div>

          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Now Playing View Mode</span>
                <span className="description">Choose what shows when you click the album art</span>
              </div>
              <select id="now-playing-mode">
                <option value="album">Go to Album</option>
                <option value="cover">Fullscreen Mode</option>
                <option value="lyrics">Lyrics Panel</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="info">
                <span className="label">Compact Artists</span>
                <span className="description">Show artist cards in a compact, horizontal layout</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="compact-artist-toggle" />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Compact Albums</span>
                <span className="description">Show album cards in a compact, horizontal layout</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="compact-album-toggle" />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Downloads Tab */}
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

      {/* System Tab */}
      <div className="settings-tab-content" id="settings-tab-system">
        <div className="settings-list">
          <div className="settings-group">
            <div className="setting-item">
              <div className="info">
                <span className="label">Keyboard Shortcuts</span>
                <span className="description">View available keyboard shortcuts</span>
              </div>
              <button id="show-shortcuts-btn" className="btn-secondary">Show Shortcuts</button>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Cache</span>
                <span className="description" id="cache-info">
                  Stores API responses to reduce requests
                </span>
              </div>
              <button id="clear-cache-btn" className="btn-secondary">Clear Cache</button>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Auto-Update App</span>
                <span className="description">Automatically reload when a new version is available</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="pwa-auto-update-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Analytics</span>
                <span className="description">Send anonymous usage data to help improve the app</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="analytics-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Reset Local Data</span>
                <span className="description">
                  Clear all local storage and cached data (does not affect cloud sync)
                </span>
              </div>
              <button id="reset-local-data-btn" className="btn-secondary danger">Reset</button>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Clear Cloud Data</span>
                <span className="description">Delete all your data from the cloud (cannot be undone)</span>
              </div>
              <button id="firebase-clear-cloud-btn" className="btn-secondary danger">
                Clear Cloud Data
              </button>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Backup &amp; Restore</span>
                <span className="description">Export or import your library and history as JSON</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button id="export-library-btn" className="btn-secondary">Export</button>
                <button id="import-library-btn" className="btn-secondary">Import</button>
                <input
                  type="file"
                  id="import-library-input"
                  style={{ display: 'none' }}
                  accept=".json"
                />
              </div>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">ADVANCED: Custom Database/Auth</span>
                <span className="description">Configure custom PocketBase and Firebase instances</span>
              </div>
              <button id="custom-db-btn" className="btn-secondary">Configure</button>
            </div>
            <div id="api-instance-manager">
              <div className="setting-item" style={{ paddingBottom: '1rem', border: 'none' }}>
                <div className="info">
                  <span className="label">API Instances</span>
                  <span className="description">Manage and prioritize API instances.</span>
                </div>
                <button id="refresh-speed-test-btn" className="btn-secondary">
                  Refresh Instance List
                </button>
              </div>
              <ul id="api-instance-list"></ul>
            </div>

            <div
              className="setting-item"
              style={{ paddingBottom: '1rem', borderTop: '1px solid var(--border)' }}
            >
              <div className="info">
                <span className="label">Blocked Content</span>
                <span className="description">
                  Manage artists, albums, and tracks you&apos;ve blocked from recommendations
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button id="manage-blocked-btn" className="btn-secondary">Manage</button>
                <button
                  id="clear-all-blocked-btn"
                  className="btn-secondary danger"
                  style={{ display: 'none' }}
                >
                  Clear All
                </button>
              </div>
            </div>
            <div id="blocked-content-list" style={{ display: 'none' }}>
              <div id="blocked-artists-section" style={{ marginBottom: '1rem' }}>
                <h4
                  style={{
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  Blocked Artists
                </h4>
                <ul id="blocked-artists-list" className="blocked-items-list"></ul>
              </div>
              <div id="blocked-albums-section" style={{ marginBottom: '1rem' }}>
                <h4
                  style={{
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  Blocked Albums
                </h4>
                <ul id="blocked-albums-list" className="blocked-items-list"></ul>
              </div>
              <div id="blocked-tracks-section" style={{ marginBottom: '1rem' }}>
                <h4
                  style={{
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  Blocked Tracks
                </h4>
                <ul id="blocked-tracks-list" className="blocked-items-list"></ul>
              </div>
              <div
                id="blocked-empty-message"
                style={{
                  textAlign: 'center',
                  padding: '1rem',
                  color: 'var(--muted-foreground)',
                  display: 'none',
                }}
              >
                No blocked content
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
