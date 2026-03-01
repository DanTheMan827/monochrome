export function ProfilePage() {
  return (
    <div id="page-profile" className="page">
      <div className="profile-header-container">
        <div className="profile-banner" id="profile-banner"></div>
        <div className="profile-info-section">
          <img id="profile-avatar" src="/assets/appicon.png" className="profile-avatar" alt="Avatar" />
          <div className="profile-details">
            <h1 id="profile-display-name">User</h1>
            <div id="profile-username" className="profile-username">@username</div>
            <div id="profile-status" className="profile-status" style={{ display: 'none' }}></div>
            <div id="profile-about" className="profile-about"></div>
            <div className="profile-links">
              <a
                id="profile-website"
                href="#"
                target="_blank"
                className="profile-link"
                style={{ display: 'none' }}
              >
                Website
              </a>
              <a
                id="profile-lastfm"
                href="#"
                target="_blank"
                className="profile-link"
                style={{ display: 'none' }}
              >
                Last.fm
              </a>
            </div>
          </div>
          <div className="profile-actions">
            <button id="profile-edit-btn" className="btn-secondary" style={{ display: 'none' }}>
              Edit Profile
            </button>
          </div>
        </div>
      </div>
      <div className="profile-content">
        <h2 className="section-title">Public Playlists</h2>
        <div className="card-grid" id="profile-playlists-container"></div>
        <div id="profile-favorite-albums-section" style={{ display: 'none', marginTop: '3rem' }}>
          <h2 className="section-title">Favorite Albums of All Time</h2>
          <div id="profile-favorite-albums-container"></div>
        </div>
        <div id="profile-recent-scrobbles-section" style={{ display: 'none', marginTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
            <h2 className="section-title" style={{ marginBottom: '0' }}>Recent Scrobbling</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Powered by Last.fm</span>
          </div>
          <div className="track-list" id="profile-recent-scrobbles-container"></div>
        </div>
        <div id="profile-top-artists-section" style={{ display: 'none', marginTop: '3rem' }}>
          <h2 className="section-title">Top Artists</h2>
          <div className="card-grid" id="profile-top-artists-container"></div>
        </div>
        <div id="profile-top-albums-section" style={{ display: 'none', marginTop: '3rem' }}>
          <h2 className="section-title">Top Albums</h2>
          <div className="card-grid" id="profile-top-albums-container"></div>
        </div>
        <div id="profile-top-tracks-section" style={{ display: 'none', marginTop: '3rem' }}>
          <h2 className="section-title">Top Tracks</h2>
          <div className="track-list" id="profile-top-tracks-container"></div>
        </div>
      </div>
    </div>
  );
}
