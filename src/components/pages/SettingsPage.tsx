import SearchIcon from '../../assets/icons/search.svg?react';
import { AppearanceSettings } from '../settings/AppearanceSettings';
import { InterfaceSettings } from '../settings/InterfaceSettings';
import { ScrobblingSettings } from '../settings/ScrobblingSettings';
import { AudioSettings } from '../settings/AudioSettings';
import { DownloadsSettings } from '../settings/DownloadsSettings';
import { SystemSettings } from '../settings/SystemSettings';

export function SettingsPage() {
  return (
    <div id="page-settings" className="page">
      <h2 className="section-title">Settings</h2>
      <form
        className="track-list-search-container settings-search-container"
        onSubmit={(e) => e.preventDefault()}
        style={{ margin: '1rem 0' }}
      >
        <SearchIcon width={20} height={20} className="search-icon" />
        <input
          type="search"
          id="settings-search-input"
          placeholder="Search settings..."
          className="track-list-search-input"
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
          ×
        </button>
      </form>
      <div className="settings-tabs">
        <button className="settings-tab active" data-tab="appearance">Appearance</button>
        <button className="settings-tab" data-tab="interface">Interface</button>
        <button className="settings-tab" data-tab="scrobbling">Scrobbling</button>
        <button className="settings-tab" data-tab="audio">Audio</button>
        <button className="settings-tab" data-tab="downloads">Downloads</button>
        <button className="settings-tab" data-tab="system">System</button>
      </div>
      <AppearanceSettings />
      <InterfaceSettings />
      <ScrobblingSettings />
      <AudioSettings />
      <DownloadsSettings />
      <SystemSettings />
    </div>
  );
}
