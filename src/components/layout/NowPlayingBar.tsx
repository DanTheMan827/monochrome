import { usePlayerStore } from '../../store/playerStore';

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
                            className="lucide lucide-shuffle-icon lucide-shuffle"
                        >
                            <path d="m18 14 4 4-4 4" />
                            <path d="m18 2 4 4-4 4" />
                            <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
                            <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
                            <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
                        </svg>
                    </button>
                    <button id="prev-btn" title="Previous">
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
                            className="lucide lucide-arrow-left-to-line-icon lucide-arrow-left-to-line"
                        >
                            <path d="M3 19V5" />
                            <path d="m13 6-6 6 6 6" />
                            <path d="M7 12h14" />
                        </svg>
                    </button>
                    <button className="play-pause-btn" title="Play"></button>
                    <button id="next-btn" title="Next">
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
                            className="lucide lucide-arrow-right-to-line-icon lucide-arrow-right-to-line"
                        >
                            <path d="M17 12H3" />
                            <path d="m11 18 6-6-6-6" />
                            <path d="M21 5v14" />
                        </svg>
                    </button>
                    <button id="repeat-btn" title="Repeat">
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
                            className="lucide lucide-repeat-icon lucide-repeat"
                        >
                            <path d="m17 2 4 4-4 4" />
                            <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                            <path d="m7 22-4-4 4-4" />
                            <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                        </svg>
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
                        <svg
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button
                        id="now-playing-mix-btn"
                        className="mix-btn"
                        data-action="track-mix"
                        title="Track Mix"
                        style={{ display: 'none' }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </button>
                    <button id="toggle-lyrics-btn" title="Lyrics" style={{ display: 'none' }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="lucide lucide-mic"
                        >
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                            <line x1="8" y1="22" x2="16" y2="22" />
                        </svg>
                    </button>
                    <button id="download-current-btn" title="Download current track" className="desktop-only">
                        <svg
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
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                    <button id="cast-btn" title="Cast">
                        <svg
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
                            <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"></path>
                            <path d="M2 12a9 9 0 0 1 9 9"></path>
                            <path d="M2 17a5 5 0 0 1 5 5"></path>
                            <path d="M2 22h.01"></path>
                        </svg>
                    </button>
                    <button id="mobile-add-playlist-btn" className="mobile-only">
                        <svg
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
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button id="sleep-timer-btn" title="Sleep Timer" className="mobile-only">
                        <svg
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
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                        </svg>
                    </button>
                    <button id="queue-btn" title="Queue">
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
                            className="lucide lucide-list-icon lucide-list"
                        >
                            <path d="M3 5h.01" />
                            <path d="M3 12h.01" />
                            <path d="M3 19h.01" />
                            <path d="M8 5h13" />
                            <path d="M8 12h13" />
                            <path d="M8 19h13" />
                        </svg>
                    </button>
                </div>
                <div className="volume-slider-row desktop-only">
                    <button id="volume-btn" title="Mute"></button>
                    <div id="volume-bar" className="volume-bar">
                        <div id="volume-fill" className="volume-fill"></div>
                    </div>
                    <button id="sleep-timer-btn-desktop" title="Sleep Timer">
                        <svg
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
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                        </svg>
                    </button>
                </div>
            </div>
        </footer>
    );
}
