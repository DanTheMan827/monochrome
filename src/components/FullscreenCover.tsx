export function FullscreenCover() {
    return (
        <div id="fullscreen-cover-overlay" style={{ display: 'none' }}>
            <div className="fullscreen-cover-content">
                <canvas id="visualizer-canvas"></canvas>
                <button id="toggle-ui-btn" className="fullscreen-ui-toggle" title="Toggle UI">
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
                    >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                </button>
                <button id="toggle-fullscreen-lyrics-btn" className="fullscreen-lyrics-toggle" title="Toggle Lyrics">
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
                    >
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
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
                                    className="heart-icon"
                                >
                                    <path
                                        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                                    ></path>
                                </svg>
                            </button>
                            <button id="fs-add-playlist-btn" className="btn-icon" title="Add to Playlist">
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
                                >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                            <button id="fs-download-btn" className="btn-icon" title="Download">
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
                                >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                            <button id="fs-cast-btn" className="btn-icon" title="Cast">
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
                                >
                                    <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"></path>
                                    <path d="M2 12a9 9 0 0 1 9 9"></path>
                                    <path d="M2 17a5 5 0 0 1 5 5"></path>
                                    <path d="M2 22h.01"></path>
                                </svg>
                            </button>
                            <button id="fs-queue-btn" className="btn-icon" title="Queue">
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
                            <button id="fs-prev-btn" title="Previous">
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
                            <button id="fs-play-pause-btn" className="play-pause-btn" title="Play">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </button>
                            <button id="fs-next-btn" title="Next">
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
                            <button id="fs-repeat-btn" title="Repeat">
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
                        <div className="fullscreen-volume-container">
                            <button id="fs-volume-btn" className="fs-volume-btn" title="Mute">
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
                                >
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
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
