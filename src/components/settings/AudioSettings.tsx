import HistoryIcon from '../../assets/icons/history.svg?react';
import TrashIcon from '../../assets/icons/trash.svg?react';

export function AudioSettings() {
  return (
    <div className="settings-tab-content" id="settings-tab-audio">
      <div className="settings-list">
        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Music Provider</span>
              <span className="description">Default service for searching and streaming</span>
            </div>
            <select id="music-provider-setting">
              <option value="tidal">Tidal</option>
              <option value="qobuz">Qobuz</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Streaming Quality</span>
              <span className="description">Quality for streaming playback</span>
            </div>
            <select id="streaming-quality-setting">
              <option value="HI_RES_LOSSLESS">Hi-Res FLAC (24-bit)</option>
              <option value="LOSSLESS">FLAC (Lossless)</option>
              <option value="HIGH">AAC 320kbps</option>
              <option value="LOW">AAC 96kbps</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Download Quality</span>
              <span className="description">Quality for track downloads</span>
            </div>
            <select id="download-quality-setting">
              <option value="HI_RES_LOSSLESS">Hi-Res FLAC (24-bit)</option>
              <option value="LOSSLESS">FLAC (Lossless)</option>
              <option value="MP3_320">MP3 320kbps</option>
              <option value="HIGH">AAC 320kbps</option>
              <option value="LOW">AAC 96kbps</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Lossless Container</span>
              <span className="description">Container format for lossless downloads</span>
            </div>
            <select id="lossless-container-setting">
              <option value="flac">FLAC</option>
              <option value="alac">Apple Lossless</option>
              <option value="nochange">Don&apos;t change</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Cover Art Size</span>
              <span className="description">Size for downloaded/embedded cover art</span>
            </div>
            <input
              type="text"
              id="cover-art-size-setting"
              className="template-input"
              style={{ width: '120px', textAlign: 'right' }}
              placeholder="1280x1280"
            />
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Show Quality Badges</span>
              <span className="description">Display &quot;HD&quot; badge for Hi-Res tracks</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="show-quality-badges-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Album release year</span>
              <span className="description">Show original album year instead of track/remaster date</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="use-album-release-year-toggle" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Gapless Playback</span>
              <span className="description">Play audio without interruption between tracks</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">ReplayGain Mode</span>
              <span className="description">Normalize volume across tracks</span>
            </div>
            <select id="replay-gain-mode">
              <option value="off">Off</option>
              <option value="track">Track</option>
              <option value="album">Album</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">ReplayGain Pre-Amp</span>
              <span className="description">Adjust gain manually (dB)</span>
            </div>
            <input
              type="number"
              id="replay-gain-preamp"
              defaultValue="3"
              step="0.5"
              style={{ width: '80px' }}
            />
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Mono Audio</span>
              <span className="description">Combine left and right channels into mono</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="mono-audio-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Exponential Volume</span>
              <span className="description">Use logarithmic volume curve for finer low-volume control</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="exponential-volume-toggle" />
              <span className="slider"></span>
            </label>
          </div>

          {/* Playback Speed Control */}
          <div className="setting-item">
            <div className="info">
              <span className="label">Playback Speed</span>
              <span className="description">Adjust playback speed (0.01x - 100x)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="range"
                id="playback-speed-slider"
                min="0.25"
                max="4.0"
                step="0.01"
                defaultValue="1.0"
                style={{ width: '150px' }}
              />
              <input
                type="number"
                id="playback-speed-input"
                min="0.01"
                max="100"
                step="0.01"
                defaultValue="1.0"
                style={{
                  width: '80px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-family)',
                  padding: '4px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontFamily: 'var(--font-family)' }}>x</span>
            </div>
          </div>

          {/* 16-Band Equalizer */}
          <div className="setting-item">
            <div className="info">
              <span className="label">Equalizer</span>
              <span className="description">16-band parametric equalizer for fine audio control</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="equalizer-enabled-toggle" />
              <span className="slider"></span>
            </label>
          </div>

          <div className="equalizer-container" id="equalizer-container" style={{ display: 'none' }}>
            <div className="equalizer-header">
              <div className="equalizer-preset-row">
                <label htmlFor="equalizer-preset-select">Preset</label>
                <select id="equalizer-preset-select">
                  <optgroup label="Built-in Presets">
                    <option value="flat">Flat</option>
                    <option value="bass_boost">Bass Boost</option>
                    <option value="bass_reducer">Bass Reducer</option>
                    <option value="treble_boost">Treble Boost</option>
                    <option value="treble_reducer">Treble Reducer</option>
                    <option value="vocal_boost">Vocal Boost</option>
                    <option value="loudness">Loudness</option>
                    <option value="rock">Rock</option>
                    <option value="pop">Pop</option>
                    <option value="classical">Classical</option>
                    <option value="jazz">Jazz</option>
                    <option value="electronic">Electronic</option>
                    <option value="hip_hop">Hip-Hop</option>
                    <option value="r_and_b">R&amp;B</option>
                    <option value="acoustic">Acoustic</option>
                    <option value="podcast">Podcast / Speech</option>
                  </optgroup>
                  <optgroup label="Custom Presets" id="custom-presets-optgroup">
                    {/* Custom presets will be populated by JavaScript */}
                  </optgroup>
                </select>
                <label htmlFor="eq-band-count">Bands</label>
                <input
                  type="number"
                  id="eq-band-count"
                  className="eq-band-count-input"
                  min="3"
                  max="32"
                  defaultValue="16"
                  title="Number of EQ bands (3-32)"
                />
                <button
                  id="equalizer-reset-btn"
                  className="btn-secondary"
                  title="Reset to Flat"
                >
                  <HistoryIcon width={16} height={16} />
                </button>
                <button
                  id="eq-export-btn"
                  className="btn-secondary"
                  title="Export EQ settings to text"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  Export
                </button>
                <button
                  id="eq-import-btn"
                  className="btn-secondary"
                  title="Import EQ settings from text or file"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  Import
                </button>
                <input
                  type="file"
                  id="eq-import-file"
                  accept=".txt"
                  style={{ display: 'none' }}
                />
              </div>

              <div className="custom-preset-controls">
                <div className="custom-preset-input-row">
                  <input
                    type="text"
                    id="custom-preset-name"
                    placeholder="Preset name (e.g., Home, Car, Work)"
                    maxLength={50}
                  />
                  <button
                    id="save-custom-preset-btn"
                    className="btn-primary"
                    title="Save current EQ as custom preset"
                  >
                    Save
                  </button>
                </div>
                <button
                  id="delete-custom-preset-btn"
                  className="btn-secondary delete-preset-btn"
                  style={{ display: 'none' }}
                  title="Delete selected custom preset"
                >
                  <TrashIcon width={16} height={16} />
                  Delete Preset
                </button>
              </div>

              <div className="eq-range-controls">
                <label>DB Range:</label>
                <input
                  type="number"
                  id="eq-range-min"
                  className="eq-range-input"
                  min="-60"
                  max="0"
                  defaultValue="-30"
                  title="Minimum gain in dB"
                />
                <span>to</span>
                <input
                  type="number"
                  id="eq-range-max"
                  className="eq-range-input"
                  min="0"
                  max="60"
                  defaultValue="30"
                  title="Maximum gain in dB"
                />
                <span>dB</span>
                <button
                  id="apply-eq-range-btn"
                  className="btn-secondary"
                  title="Apply new range to all bands"
                >
                  Apply
                </button>
                <button
                  id="reset-eq-range-btn"
                  className="btn-secondary"
                  title="Reset to default (-30 to +30 dB)"
                >
                  Reset
                </button>
              </div>

              <div className="eq-freq-controls">
                <label>Freq Range:</label>
                <input
                  type="number"
                  id="eq-freq-min"
                  className="eq-freq-input"
                  min="10"
                  max="20000"
                  defaultValue="20"
                  title="Minimum frequency in Hz"
                />
                <span>Hz to</span>
                <input
                  type="number"
                  id="eq-freq-max"
                  className="eq-freq-input"
                  min="20"
                  max="96000"
                  defaultValue="20000"
                  title="Maximum frequency in Hz"
                />
                <span>Hz</span>
                <button
                  id="apply-eq-freq-btn"
                  className="btn-secondary"
                  title="Apply new frequency range"
                >
                  Apply
                </button>
                <button
                  id="reset-eq-freq-btn"
                  className="btn-secondary"
                  title="Reset to default (20 Hz to 20 kHz)"
                >
                  Reset
                </button>
              </div>

              <div
                className="eq-preamp-controls"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
              >
                <label style={{ fontSize: '0.75rem', opacity: 0.8 }}>Preamp:</label>
                <input
                  type="range"
                  id="eq-preamp-slider"
                  min="-20"
                  max="20"
                  step="0.1"
                  defaultValue="0"
                  style={{ flex: 1, maxWidth: '120px' }}
                  title="Preamp gain in dB"
                />
                <input
                  type="number"
                  id="eq-preamp-input"
                  min="-20"
                  max="20"
                  step="0.1"
                  defaultValue="0"
                  style={{ width: '60px', padding: '0.25rem', fontSize: '0.75rem' }}
                  title="Preamp value in dB"
                />
                <span style={{ fontSize: '0.75rem' }}>dB</span>
              </div>
            </div>

            <div className="equalizer-bands-wrapper">
              <canvas id="eq-response-canvas" className="eq-response-canvas"></canvas>
              <div className="equalizer-bands" id="equalizer-bands">
                {/* Bands will be dynamically generated by JavaScript */}
              </div>
            </div>

            <div className="equalizer-scale">
              <span>+30 dB</span>
              <span>0 dB</span>
              <span>-30 dB</span>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <div className="setting-item">
            <div className="info">
              <span className="label">Now Playing View Mode</span>
              <span className="description">Choose what shows when you click the album art</span>
            </div>
            <select id="now-playing-mode">
              <option value="album">Go to Album</option>
              <option value="cover">Fullscreen Mode</option>
              <option value="lyrics">Lyrics Panel</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="info">
              <span className="label">Compact Artists</span>
              <span className="description">Show artist cards in a compact, horizontal layout</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="compact-artist-toggle" />
              <span className="slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="info">
              <span className="label">Compact Albums</span>
              <span className="description">Show album cards in a compact, horizontal layout</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" id="compact-album-toggle" />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
