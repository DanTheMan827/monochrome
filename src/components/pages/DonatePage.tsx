export function DonatePage() {
  return (
    <div id="page-donate" className="page">
      <h2 className="section-title" style={{ textAlign: 'center' }}>Donate to Monochrome</h2>
      <div className="donate-content">
        <p style={{ textAlign: 'center' }} className="donate-description">
          If Monochrome has been useful to you and you&apos;re able to, consider making a donation. <br />
          It helps pay for the domain, and you get to support us :)
        </p>
        <a href="https://ko-fi.com/monochromemusic">
          <button id="donate-btn-page" className="btn-secondary">Donate to Monochrome</button>
        </a>
      </div>
    </div>
  );
}
