import LayoutIcon from '../assets/icons/layout.svg?react';
import MicIcon from '../assets/icons/mic.svg?react';
import HeartIcon from '../assets/icons/heart.svg?react';
import AddToPlaylistIcon from '../assets/icons/add-to-playlist.svg?react';
import DownloadIcon from '../assets/icons/download.svg?react';
import CastIcon from '../assets/icons/cast.svg?react';
import QueueIcon from '../assets/icons/queue.svg?react';
import ShuffleIcon from '../assets/icons/shuffle.svg?react';
import PrevTrackIcon from '../assets/icons/prev-track.svg?react';
import PlayIcon from '../assets/icons/play.svg?react';
import NextTrackIcon from '../assets/icons/next-track.svg?react';
import RepeatIcon from '../assets/icons/repeat.svg?react';
import VolumeIcon from '../assets/icons/volume.svg?react';

export function FullscreenCover() {
    return (
        <div id="fullscreen-cover-overlay" style={{ display: 'none' }}>
            <div className="fullscreen-cover-content">
                <canvas id="visualizer-canvas"></canvas>
                <button id="toggle-ui-btn" className="fullscreen-ui-toggle" title="Toggle UI">
                    <LayoutIcon width={24} height={24} />
                </button>
                <button id="toggle-fullscreen-lyrics-btn" className="fullscreen-lyrics-toggle" title="Toggle Lyrics">
                    <MicIcon width={24} height={24} />
                </button>
                <button id="close-fullscreen-cover-btn" title="Close">&times;</button>
                <div className="fullscreen-main-view">
                    <img
                        id="fullscreen-cover-image"
                        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                        alt="Album Cover"
                    />
                    <div className="fullscreen-track-info">
                        <h2 id="fullscreen-track-title"></h2>
                        <h3 id="fullscreen-track-artist"></h3>
                        <div className="fullscreen-actions">
                            <button id="fs-like-btn" className="btn-icon like-btn" title="Like">
                                <HeartIcon width={24} height={24} className="heart-icon" />
                            </button>
                            <button id="fs-add-playlist-btn" className="btn-icon" title="Add to Playlist">
                                <AddToPlaylistIcon width={24} height={24} />
                            </button>
                            <button id="fs-download-btn" className="btn-icon" title="Download">
                                <DownloadIcon width={24} height={24} />
                            </button>
                            <button id="fs-cast-btn" className="btn-icon" title="Cast">
                                <CastIcon width={24} height={24} />
                            </button>
                            <button id="fs-queue-btn" className="btn-icon" title="Queue">
                                <QueueIcon width={24} height={24} />
                            </button>
                        </div>
                        <div id="fullscreen-next-track" style={{ display: 'none' }}>
                            <span className="label">Up Next: </span>
                            <span className="value"></span>
                        </div>
                    </div>
                    <div className="fullscreen-controls">
                        <div className="fullscreen-progress-container">
                            <span id="fs-current-time">0:00</span>
                            <div id="fs-progress-bar" className="progress-bar">
                                <div id="fs-progress-fill" className="progress-fill"></div>
                            </div>
                            <span id="fs-total-duration">0:00</span>
                        </div>
                        <div className="fullscreen-buttons">
                            <button id="fs-shuffle-btn" title="Shuffle">
                                <ShuffleIcon width={24} height={24} />
                            </button>
                            <button id="fs-prev-btn" title="Previous">
                                <PrevTrackIcon width={24} height={24} />
                            </button>
                            <button id="fs-play-pause-btn" className="play-pause-btn" title="Play">
                                <PlayIcon width={32} height={32} fill="currentColor" stroke="currentColor" strokeWidth={2} />
                            </button>
                            <button id="fs-next-btn" title="Next">
                                <NextTrackIcon width={24} height={24} />
                            </button>
                            <button id="fs-repeat-btn" title="Repeat">
                                <RepeatIcon width={24} height={24} />
                            </button>
                        </div>
                        <div className="fullscreen-volume-container">
                            <button id="fs-volume-btn" className="fs-volume-btn" title="Mute">
                                <VolumeIcon width={24} height={24} />
                            </button>
                            <div id="fs-volume-bar" className="fs-volume-bar">
                                <div id="fs-volume-fill" className="fs-volume-fill"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
