import RotateCwIcon from '../../assets/icons/rotate-cw.svg?react';
import TrashIcon from '../../assets/icons/trash.svg?react';

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
              <RotateCwIcon width={16} height={16} />
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
              <RotateCwIcon width={16} height={16} />
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
              <RotateCwIcon width={16} height={16} />
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
              <TrashIcon width={16} height={16} />
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
