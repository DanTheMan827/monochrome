import { MainHeader } from './MainHeader';
import { HomePage } from '../pages/HomePage';
import { SearchPage } from '../pages/SearchPage';
import { LibraryPage } from '../pages/LibraryPage';
import { RecentPage } from '../pages/RecentPage';
import { UnreleasedPage } from '../pages/UnreleasedPage';
import { TrackerArtistPage } from '../pages/TrackerArtistPage';
import { AlbumPage } from '../pages/AlbumPage';
import { PlaylistPage } from '../pages/PlaylistPage';
import { FolderPage } from '../pages/FolderPage';
import { MixPage } from '../pages/MixPage';
import { ArtistPage } from '../pages/ArtistPage';
import { TrackPage } from '../pages/TrackPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';
import { AboutPage } from '../pages/AboutPage';
import { AccountPage } from '../pages/AccountPage';
import { DownloadPage } from '../pages/DownloadPage';
import { DonatePage } from '../pages/DonatePage';

export function MainContent() {
    return (
        <main className="main-content">
            <div id="page-background"></div>
            <MainHeader />
            <HomePage />
            <SearchPage />
            <LibraryPage />
            <RecentPage />
            <UnreleasedPage />
            <TrackerArtistPage />
            <AlbumPage />
            <PlaylistPage />
            <FolderPage />
            <MixPage />
            <ArtistPage />
            <TrackPage />
            <ProfilePage />
            <SettingsPage />
            <AboutPage />
            <AccountPage />
            <DownloadPage />
            <DonatePage />
        </main>
    );
}
