export function HomePage() {
  return (
    <div id="page-home" className="page">
      <div id="home-welcome" style={{ display: 'none', textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Welcome to Monochrome</h2>
        <p style={{ color: 'var(--muted-foreground)' }}>
          You haven&apos;t listened to anything yet. Search for your favorite songs to get started!
        </p>
      </div>

      <section className="content-section" id="home-editors-picks-section-empty" style={{ marginTop: '0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2 className="section-title" style={{ marginBottom: '0' }}>Editor&apos;s Picks</h2>
        </div>
        <div className="card-grid" id="home-editors-picks-empty"></div>
      </section>

      <div id="home-content" style={{ display: 'none' }}>
        <section className="content-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 className="section-title" style={{ marginBottom: '0' }}>Recommended Songs</h2>
            <button
              className="btn-secondary"
              id="refresh-songs-btn"
              title="Refresh"
              style={{ padding: '4px 8px' }}
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
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className="track-list" id="home-recommended-songs"></div>
        </section>
        <section className="content-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 className="section-title" style={{ marginBottom: '0' }}>Recommended Albums</h2>
            <button
              className="btn-secondary"
              id="refresh-albums-btn"
              title="Refresh"
              style={{ padding: '4px 8px' }}
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
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className="card-grid" id="home-recommended-albums"></div>
        </section>
        <section className="content-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 className="section-title" style={{ marginBottom: '0' }}>Recommended Artists</h2>
            <button
              className="btn-secondary"
              id="refresh-artists-btn"
              title="Refresh"
              style={{ padding: '4px 8px' }}
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
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
          </div>
          <div className="card-grid" id="home-recommended-artists"></div>
        </section>
        <section className="content-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 className="section-title" style={{ marginBottom: '0' }}>Jump Back In</h2>
            <button
              className="btn-secondary"
              id="clear-recent-btn"
              title="Clear History"
              style={{ padding: '4px 8px' }}
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>
          <div className="card-grid" id="home-recent-mixed"></div>
        </section>
        <section className="content-section" id="home-editors-picks-section">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h2 className="section-title" style={{ marginBottom: '0' }}>Editor&apos;s Picks</h2>
          </div>
          <div className="card-grid" id="home-editors-picks"></div>
        </section>
      </div>
    </div>
  );
}
