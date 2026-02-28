export function MainHeader() {
  return (
    <header className="main-header">
      <div className="navigation-controls desktop-only">
        <button id="nav-back" className="nav-btn" title="Go Back">
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
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button id="nav-forward" className="nav-btn" title="Go Forward">
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
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <button className="hamburger-menu" id="hamburger-btn" title="Open navigation">
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
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div className="header-account-control" style={{ position: 'relative', marginRight: '1rem' }}>
        <button
          id="header-account-btn"
          className="btn-icon"
          title="Account"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            overflow: 'hidden',
            padding: '0',
            border: '1px solid var(--border)',
          }}
        >
          <svg
            id="header-account-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <img
            id="header-account-img"
            alt="Account avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }}
          />
        </button>
        <div id="header-account-dropdown" className="dropdown-menu"></div>
      </div>
      <form className="search-bar" id="search-form">
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
          className="search-icon"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          id="search-input"
          placeholder="Search for tracks, artists, albums..."
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
          &times;
        </button>
        <div id="search-history" className="search-history" style={{ display: 'none' }}></div>
      </form>
    </header>
  );
}
