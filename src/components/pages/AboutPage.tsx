export function AboutPage() {
  return (
    <div id="page-about" className="page">
      <h2 className="section-title">About Monochrome</h2>
      <div className="about-content">
        <p className="about-description">
          Monochrome is a lightweight, privacy-focused music streaming client designed for high-fidelity audio
          playback. Built with modern web technologies, it provides a clean, distraction-free listening experience.
          <br />
        </p>
        <br />
        <div className="about-features">
          <h4>Features</h4>
          <ul>
            <li>High-quality lossless audio streaming</li>
            <li>Lyrics support with karaoke mode</li>
            <li>Recently Played tracking for easy history access</li>
            <li>Comprehensive Personal Library for favorites</li>
            <li>Intelligent API caching for improved performance</li>
            <li>Offline-capable Progressive Web App (PWA)</li>
            <li>Media Session API integration for system controls</li>
            <li>Queue management with shuffle and repeat modes</li>
            <li>Track downloads with automatic metadata embedding</li>
            <li>Multiple API instance support with failover</li>
            <li>Dark, minimalist interface optimized for focus</li>
            <li>Customizable themes</li>
            <li>Keyboard shortcuts for power users</li>
          </ul>
        </div>
        <div className="about-tech">
          <h4>Technology Stack</h4>
          <p>Vanilla JavaScript • ES6 Modules • IndexedDB • Service Workers • Media Session API</p>
        </div>
        <br /><br /><br />
        <div className="about-donate">
          <h2 className="section-title" style={{ textAlign: 'center' }}>Donate to Monochrome</h2>
          <p style={{ textAlign: 'center' }} className="donate-description">
            If Monochrome has been useful to you and you&apos;re able to, consider making a donation.
            <br />
            It helps pay for the server and domain, and you get to support us :)
          </p>
          <div
            className="donate-button"
            id="donate-button-container"
            style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '50px',
              flexWrap: 'wrap',
            }}
          >
            <a href="https://ko-fi.com/monochromemusic">
              <button id="donate-btn" className="btn-secondary">Donate to Monochrome</button>
            </a>
          </div>
        </div>
        <br /><br /><br />
        <div className="about-links">
          <a
            href="https://github.com/monochrome-music/monochrome"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-github-icon lucide-github"
            >
              <path
                d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
              />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            View on GitHub
          </a>
        </div>
        <p style={{ textAlign: 'center', color: 'grey' }}>
          made with ‪‪❤︎‬ by{' '}
          <a href="https://prigoana.com/" style={{ textDecoration: 'underline' }}>Edideaur</a>,{' '}
          <a href="https://samidy.com" style={{ textDecoration: 'underline' }}>Samidy</a> &amp;{' '}
          <a href="https://github.com/JulienMaille" style={{ textDecoration: 'underline' }}>Julien</a>
        </p>
        <div className="about-footer">
          <p className="version">Version 2.2.0</p>
          <p className="disclaimer">
            This is an independent client and is not affiliated with or endorsed by TIDAL or any music streaming
            service.
          </p>
          <p className="disclaimer">
            This application does not host, store, or distribute any media files. <br />
            All content displayed or accessed through this app is provided by third‑party services and APIs that
            are publicly available on the internet. <br />
            We do not control, operate, or maintain any external content sources and are not responsible for the
            accuracy, availability, or legality of any content provided by third parties. <br />
            Users are solely responsible for how they use this application and for ensuring that their use
            complies with applicable laws and regulations in their jurisdiction.
          </p>
        </div>
      </div>
    </div>
  );
}
