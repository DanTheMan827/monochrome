export function InterfaceSettings() {
  return (
    <div className="settings-tab-content" id="settings-tab-interface">
      <div className="settings-list">
        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Show Recommended Songs</span>
              <span className="description">Display recommended songs on the home page</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="show-recommended-songs-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Show Recommended Albums</span>
              <span className="description">Display recommended albums on the home page</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="show-recommended-albums-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Show Recommended Artists</span>
              <span className="description">Display recommended artists on the home page</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="show-recommended-artists-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Show Jump Back In</span>
              <span className="description">
                Display recent albums, playlists, and mixes on the home page
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="show-jump-back-in-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Show Editor&apos;s Picks</span>
              <span className="description">Display curated album selections on the home page</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="show-editors-picks-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Shuffle Editor&apos;s Picks</span>
              <span className="description">Randomize the order of editor&apos;s picks on each load</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="shuffle-editors-picks-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-group" id="sidebar-order-settings-group">
          <div className="sidebar-settings-section sidebar-settings-main">
            <span className="sidebar-settings-section-label">TOP SECTION</span>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Home in Sidebar</span>
                <span className="description">Display the Home link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-home-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Library in Sidebar</span>
                <span className="description">Display the Library link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-library-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Recent in Sidebar</span>
                <span className="description">Display the Recent link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-recent-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Unreleased in Sidebar</span>
                <span className="description">Display the Unreleased link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-unreleased-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Donate in Sidebar</span>
                <span className="description">Display the Donate link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-donate-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Settings in Sidebar</span>
                <span className="description">Display the Settings link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-settings-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>
          <div className="sidebar-settings-section sidebar-settings-bottom">
            <span className="sidebar-settings-section-label">BOTTOM SECTION</span>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show About in Sidebar</span>
                <span className="description">Display the About link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-about-bottom-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Download in Sidebar</span>
                <span className="description">Display the Download link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-download-bottom-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
            <div className="setting-item">
              <div className="info">
                <span className="label">Show Discord in Sidebar</span>
                <span className="description">Display the Discord link in the sidebar navigation</span>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" id="sidebar-show-discordbtn-toggle" defaultChecked />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Close Modals on Navigation</span>
              <span className="description">
                Close open modals and panels (like lyrics, queue) when navigating back or to a new page
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="close-modals-on-navigation-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Intercept Back to Close Modals</span>
              <span className="description">
                When pressing back, close open modals/panels first without navigating. Press back again to
                actually go back.
              </span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="intercept-back-to-close-modals-toggle" />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
