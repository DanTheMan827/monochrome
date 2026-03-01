export function ScrobblingSettings() {
  return (
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
  );
}
