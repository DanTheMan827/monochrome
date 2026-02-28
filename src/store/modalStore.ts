import { useSyncExternalStore } from 'react';

export type ModalId =
    | 'playlist'
    | 'editProfile'
    | 'folder'
    | 'emailAuth'
    | 'playlistSelect'
    | 'shortcuts'
    | 'missingTracks'
    | 'sleepTimer'
    | 'discographyDownload'
    | 'customDb'
    | 'themeStore'
    | 'tracker'
    | 'epilepsyWarning';

interface ModalState {
    openModals: Set<ModalId>;
}

class ModalStoreClass {
    private _state: ModalState = { openModals: new Set() };
    private _listeners = new Set<() => void>();

    getSnapshot(): ModalState {
        return this._state;
    }

    subscribe(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    open(id: ModalId): void {
        const next = new Set(this._state.openModals);
        next.add(id);
        this._state = { openModals: next };
        this._listeners.forEach((l) => l());
    }

    close(id: ModalId): void {
        const next = new Set(this._state.openModals);
        next.delete(id);
        this._state = { openModals: next };
        this._listeners.forEach((l) => l());
    }

    isOpen(id: ModalId): boolean {
        return this._state.openModals.has(id);
    }
}

export const modalStore = new ModalStoreClass();

export function useModalStore(): { isOpen: (id: ModalId) => boolean } {
    const state = useSyncExternalStore(
        (cb) => modalStore.subscribe(cb),
        () => modalStore.getSnapshot()
    );
    return {
        isOpen: (id: ModalId) => state.openModals.has(id),
    };
}
