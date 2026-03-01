export function AccountPage() {
  return (
    <div id="page-account" className="page">
      <h2 className="section-title" style={{ textAlign: 'center' }}>Sign Up / Sign In</h2>
      <div className="account-content">
        <p style={{ textAlign: 'center' }} className="account-description">
          Make an account to allow syncing your library between devices.
        </p>
        <div
          className="account-buttons"
          id="auth-buttons-container"
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '50px',
            flexWrap: 'wrap',
          }}
        >
          <button id="firebase-connect-btn" className="btn-secondary">Connect with Google</button>
          <button id="toggle-email-auth-btn" className="btn-secondary">Connect with Email</button>
          <button id="view-my-profile-btn" className="btn-secondary" style={{ display: 'none' }}>
            View My Profile
          </button>
        </div>

        <p id="firebase-status" style={{ textAlign: 'center', paddingTop: '15px', color: '#8b8b93' }}>
          Sync your library across devices
        </p>
        <p style={{ paddingTop: '50px', textAlign: 'center', color: '#8b8b93' }}>
          We only store music data and a randomized ID to find out which Google/Email account is which.
          <br />
          All data is anonymous. We do not store anything like emails, usernames, or anything sensitive. <br />
        </p>
        <p style={{ paddingTop: '50px', textAlign: 'center', color: '#8b8b93' }}>
          However, if you want complete control over your data, we allow you to use your own Database
          Configuration.
        </p>
        <div
          style={{
            display: 'flex',
            gap: '50px',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: '25px',
          }}
        >
          <a id="advanced-config-link" className="btn-secondary" href="/settings">
            Advanced: Custom Configuration
          </a>
        </div>
      </div>
    </div>
  );
}
