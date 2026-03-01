import ChevronLeftIcon from '../../assets/icons/chevron-left.svg?react';
import ChevronRightIcon from '../../assets/icons/chevron-right.svg?react';
import MenuIcon from '../../assets/icons/menu.svg?react';
import UserIcon from '../../assets/icons/user.svg?react';
import SearchIcon from '../../assets/icons/search.svg?react';

export function MainHeader() {
  return (
    <header className="main-header">
      <div className="navigation-controls desktop-only">
        <button id="nav-back" className="nav-btn" title="Go Back">
          <ChevronLeftIcon width={24} height={24} />
        </button>
        <button id="nav-forward" className="nav-btn" title="Go Forward">
          <ChevronRightIcon width={24} height={24} />
        </button>
      </div>
      <button className="hamburger-menu" id="hamburger-btn" title="Open navigation">
        <MenuIcon width={24} height={24} />
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
          <UserIcon id="header-account-icon" width={20} height={20} />
          <img
            id="header-account-img"
            alt="Account avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }}
          />
        </button>
        <div id="header-account-dropdown" className="dropdown-menu"></div>
      </div>
      <form className="search-bar" id="search-form">
        <SearchIcon width={24} height={24} className="search-icon" />
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
