import { NavigateCapture } from '../NavigateCapture';
import { ContextMenu } from './ContextMenu';
import { SortMenu } from './SortMenu';
import { SidePanel } from './SidePanel';
import { FullscreenCover } from './FullscreenCover';
import { SidebarOverlay } from './SidebarOverlay';
import { CsvImportProgress } from './CsvImportProgress';
import { PlaylistModal } from './modals/PlaylistModal';
import { EditProfileModal } from './modals/EditProfileModal';
import { FolderModal } from './modals/FolderModal';
import { EmailAuthModal } from './modals/EmailAuthModal';
import { PlaylistSelectModal } from './modals/PlaylistSelectModal';
import { ShortcutsModal } from './modals/ShortcutsModal';
import { MissingTracksModal } from './modals/MissingTracksModal';
import { SleepTimerModal } from './modals/SleepTimerModal';
import { DiscographyDownloadModal } from './modals/DiscographyDownloadModal';
import { CustomDbModal } from './modals/CustomDbModal';
import { ThemeStoreModal } from './modals/ThemeStoreModal';
import { TrackerModal } from './modals/TrackerModal';
import { EpilepsyWarningModal } from './modals/EpilepsyWarningModal';
import { Sidebar } from './layout/Sidebar';
import { MainContent } from './layout/MainContent';
import { NowPlayingBar } from './layout/NowPlayingBar';

export function AppShell() {
    return (
        <>
            <NavigateCapture />
            <audio id="audio-player" crossOrigin="anonymous"></audio>
            <ContextMenu />
            <SortMenu />
            <SidePanel />
            <FullscreenCover />
            <PlaylistModal />
            <EditProfileModal />
            <FolderModal />
            <EmailAuthModal />
            <PlaylistSelectModal />
            <ShortcutsModal />
            <MissingTracksModal />
            <SleepTimerModal />
            <DiscographyDownloadModal />
            <CustomDbModal />
            <ThemeStoreModal />
            <TrackerModal />
            <EpilepsyWarningModal />
            <SidebarOverlay />
            <CsvImportProgress />
            <div className="app-container">
                <Sidebar />
                <MainContent />
                <NowPlayingBar />
            </div>
        </>
    );
}
