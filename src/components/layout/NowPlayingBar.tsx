import { usePlayerStore } from '../../store/playerStore';
import ShuffleIcon from '../../assets/icons/shuffle.svg?react';
import PrevTrackIcon from '../../assets/icons/prev-track.svg?react';
import NextTrackIcon from '../../assets/icons/next-track.svg?react';
import RepeatIcon from '../../assets/icons/repeat.svg?react';
import AddToPlaylistIcon from '../../assets/icons/add-to-playlist.svg?react';
import MusicNoteIcon from '../../assets/icons/music-note.svg?react';
import MicIcon from '../../assets/icons/mic.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';
import CastIcon from '../../assets/icons/cast.svg?react';
import SleepTimerIcon from '../../assets/icons/sleep-timer.svg?react';
import QueueIcon from '../../assets/icons/queue.svg?react';

export function NowPlayingBar() {
    const player = usePlayerStore();

    return (
        <footer className="now-playing-bar">
            <div className="track-info">
                <img src={player.coverSrc} alt="Current Track Cover" className="cover" />
                <div className="details">
                    <div className="title">{player.trackTitle}</div>
                    <div className="album">{player.trackAlbum}</div>
                    <div className="artist">{player.trackArtist}</div>
                </div>
            </div>
            <div className="player-controls">
                <div className="buttons">
                    <button id="shuffle-btn" title="Shuffle">
                        <ShuffleIcon
                            width={24}
                            height={24}
                            className="lucide lucide-shuffle-icon lucide-shuffle"
                        />
                    </button>
                    <button id="prev-btn" title="Previous">
                        <PrevTrackIcon
                            width={24}
                            height={24}
                            className="lucide lucide-arrow-left-to-line-icon lucide-arrow-left-to-line"
                        />
                    </button>
                    <button className="play-pause-btn" title="Play"></button>
                    <button id="next-btn" title="Next">
                        <NextTrackIcon
                            width={24}
                            height={24}
                            className="lucide lucide-arrow-right-to-line-icon lucide-arrow-right-to-line"
                        />
                    </button>
                    <button id="repeat-btn" title="Repeat">
                        <RepeatIcon
                            width={24}
                            height={24}
                            className="lucide lucide-repeat-icon lucide-repeat"
                        />
                    </button>
                </div>
                <div className="progress-container">
                    <span id="current-time">0:00</span>
                    <div id="progress-bar" className="progress-bar">
                        <div id="progress-fill" className="progress-fill"></div>
                    </div>
                    <span id="total-duration">0:00</span>
                </div>
            </div>
            <div className="volume-controls">
                <div className="player-actions-row">
                    <button
                        id="now-playing-like-btn"
                        className="like-btn"
                        data-action="toggle-like"
                        title="Save to Favorites"
                        style={{ display: 'none' }}
                    ></button>
                    <button id="now-playing-add-playlist-btn" title="Add to Playlist" className="desktop-only">
                        <AddToPlaylistIcon width={20} height={20} />
                    </button>
                    <button
                        id="now-playing-mix-btn"
                        className="mix-btn"
                        data-action="track-mix"
                        title="Track Mix"
                        style={{ display: 'none' }}
                    >
                        <MusicNoteIcon width={20} height={20} />
                    </button>
                    <button id="toggle-lyrics-btn" title="Lyrics" style={{ display: 'none' }}>
                        <MicIcon
                            width={20}
                            height={20}
                            className="lucide lucide-mic"
                        />
                    </button>
                    <button id="download-current-btn" title="Download current track" className="desktop-only">
                        <DownloadIcon width={20} height={20} />
                    </button>
                    <button id="cast-btn" title="Cast">
                        <CastIcon width={20} height={20} />
                    </button>
                    <button id="mobile-add-playlist-btn" className="mobile-only">
                        <AddToPlaylistIcon width={20} height={20} />
                    </button>
                    <button id="sleep-timer-btn" title="Sleep Timer" className="mobile-only">
                        <SleepTimerIcon width={20} height={20} />
                    </button>
                    <button id="queue-btn" title="Queue">
                        <QueueIcon
                            width={24}
                            height={24}
                            className="lucide lucide-list-icon lucide-list"
                        />
                    </button>
                </div>
                <div className="volume-slider-row desktop-only">
                    <button id="volume-btn" title="Mute"></button>
                    <div id="volume-bar" className="volume-bar">
                        <div id="volume-fill" className="volume-fill"></div>
                    </div>
                    <button id="sleep-timer-btn-desktop" title="Sleep Timer">
                        <SleepTimerIcon width={20} height={20} />
                    </button>
                </div>
            </div>
        </footer>
    );
}
