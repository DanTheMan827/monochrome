export function SystemSettings() {
  return (
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
  );
}
