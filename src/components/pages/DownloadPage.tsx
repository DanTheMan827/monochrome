import WindowsIcon from '../../assets/icons/windows.svg?react';
import LinuxIcon from '../../assets/icons/linux.svg?react';

export function DownloadPage() {
  return (
    <div id="page-download" className="page">
      <h2 className="section-title" style={{ textAlign: 'center' }}>Monochrome Official App</h2>
      <div className="download-content">
        <p style={{ textAlign: 'center' }} className="account-description">
          Install the Monochrome Desktop App for a refined &amp; improved music listening experience.
        </p>
        <br /><br />

        <div className="download-buttons-icons">
          <div className="download-buttons-icons-windows" style={{ display: 'flex', justifyContent: 'center' }}>
            <WindowsIcon width={96} height={96} />
          </div>
          <br />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a
              id="download-windows-btn"
              className="btn-secondary"
              href="https://downloads.samidy.com/out_delivery/monochrome-windows.zip"
            >
              Download Windows Version
            </a>
          </div>
          <br />
          <div className="download-buttons-icons-linux" style={{ display: 'flex', justifyContent: 'center' }}>
            <LinuxIcon width={96} height={96} />
          </div>
          <br />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a
              id="download-linux-btn"
              className="btn-secondary"
              href="https://downloads.samidy.com/out_delivery/monochrome-linux.zip"
            >
              Download Linux Version
            </a>
          </div>
          <br />
        </div>
        <br />
        <h4 style={{ textAlign: 'center', paddingTop: '15px', color: '#8b8b93' }}>
          The App is still in Beta. Please report any issues in our{' '}
          <a href="https://monochrome.samidy.com/discord" style={{ textDecoration: 'underline' }}>
            Discord server.
          </a>
        </h4>
      </div>
    </div>
  );
}
