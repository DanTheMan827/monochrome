import LogoIcon from '../../assets/icons/logo.svg?react';
import SidebarToggleIcon from '../../assets/icons/sidebar-toggle.svg?react';
import HomeIcon from '../../assets/icons/home.svg?react';
import LibraryIcon from '../../assets/icons/library.svg?react';
import HistoryIcon from '../../assets/icons/history.svg?react';
import GridIcon from '../../assets/icons/grid.svg?react';
import HeartHandshakeIcon from '../../assets/icons/heart-handshake.svg?react';
import SettingsIcon from '../../assets/icons/settings.svg?react';
import InfoIcon from '../../assets/icons/info.svg?react';
import DiscordIcon from '../../assets/icons/discord.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';

export function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-content">
                <div className="sidebar-logo">
                    <a href="https://monochrome.tf/" className="sidebar-logo-link">
                        <LogoIcon className="app-logo" width={200} height={200} />
                        <span>Monochrome</span>
                    </a>
                    <button
                        id="sidebar-toggle"
                        className="btn-icon desktop-only"
                        style={{ marginLeft: 'auto' }}
                        title="Collapse Sidebar"
                    >
                        <SidebarToggleIcon width={20} height={20} />
                    </button>
                </div>
                <nav className="sidebar-nav main">
                    <ul>
                        <li className="nav-item" id="sidebar-nav-home">
                            <a href="/">
                                <HomeIcon
                                    width={24}
                                    height={24}
                                    className="lucide lucide-house-icon lucide-house"
                                />
                                <span>Home</span>
                            </a>
                        </li>
                        <li className="nav-item" id="sidebar-nav-library">
                            <a href="/library">
                                <LibraryIcon width={24} height={24} />
                                <span>Library</span>
                            </a>
                        </li>
                        <li className="nav-item" id="sidebar-nav-recent">
                            <a href="/recent">
                                <HistoryIcon width={24} height={24} />
                                <span>Recent</span>
                            </a>
                        </li>
                        <li className="nav-item" id="sidebar-nav-unreleased">
                            <a href="/unreleased">
                                <GridIcon width={24} height={24} />
                                <span>Unreleased</span>
                            </a>
                        </li>
                        <li className="nav-item" id="sidebar-nav-donate">
                            <a href="https://ko-fi.com/monochromemusic" target="_blank" rel="noopener noreferrer">
                                <HeartHandshakeIcon width={24} height={24} />
                                <span>Donate</span>
                            </a>
                        </li>
                        <li className="nav-item" id="sidebar-nav-settings">
                            <a href="/settings">
                                <SettingsIcon width={24} height={24} />
                                <span>Settings</span>
                            </a>
                        </li>
                    </ul>
                </nav>
                <div className="sidebar-bottom-container">
                    <nav className="sidebar-nav" id="pinned-items-nav" style={{ display: 'none' }}>
                        <h4 className="pinned-items-header">Pinned</h4>
                        <ul id="pinned-items-list">
                            {/* Pinned items are injected here */}
                        </ul>
                    </nav>
                    <div className="sidebar-nav-bottom">
                        <nav className="sidebar-nav bottom">
                            <ul>
                                <li className="nav-item" id="sidebar-nav-about-bottom">
                                    <a href="/about">
                                        <InfoIcon
                                            width={24}
                                            height={24}
                                            className="lucide lucide-info-icon lucide-info"
                                        />
                                        <span>About</span>
                                    </a>
                                </li>
                                <li className="nav-item" id="sidebar-nav-discordbtn">
                                    <a href="https://monochrome.samidy.com/discord" target="_blank" rel="noreferrer">
                                        <DiscordIcon width={64} height={64} />
                                        <span>Discord</span>
                                    </a>
                                </li>
                                <li className="nav-item" id="sidebar-nav-download-bottom">
                                    <a href="/download">
                                        <DownloadIcon width={24} height={24} />
                                        <span>Download</span>
                                    </a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>
            </div>
        </aside>
    );
}
