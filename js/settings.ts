//js/settings
import {
    themeManager,
    lastFMStorage,
    nowPlayingSettings,
    lyricsSettings,
    backgroundSettings,
    dynamicColorSettings,
    cardSettings,
    waveformSettings,
    replayGainSettings,
    smoothScrollingSettings,
    downloadQualitySettings,
    losslessContainerSettings,
    coverArtSizeSettings,
    qualityBadgeSettings,
    trackDateSettings,
    visualizerSettings,
    bulkDownloadSettings,
    playlistSettings,
    equalizerSettings,
    listenBrainzSettings,
    malojaSettings,
    libreFmSettings,
    homePageSettings,
    sidebarSectionSettings,
    fontSettings,
    monoAudioSettings,
    exponentialVolumeSettings,
    audioEffectsSettings,
    settingsUiState,
    pwaUpdateSettings,
    contentBlockingSettings,
    musicProviderSettings,
    analyticsSettings,
    modalSettings,
} from './storage.ts';
import { audioContextManager, EQ_PRESETS } from './audio-context.ts';
import { getButterchurnPresets } from './visualizers/butterchurn.ts';
import { db } from './db.ts';
import { authManager } from './accounts/auth.ts';
import { syncManager } from './accounts/pocketbase.ts';
import { saveFirebaseConfig, clearFirebaseConfig } from './accounts/config.ts';

interface ScrobblerService {
    isAuthenticated(): boolean;
    username: string;
    disconnect(): void;
    getAuthUrl(): Promise<{ token: string; url: string }>;
    completeAuthentication(token: string): Promise<{ success: boolean; username?: string }>;
    authenticateWithCredentials(username: string, password: string): Promise<{ success: boolean }>;
    reloadCredentials(): void;
}

interface Scrobbler {
    lastfm: ScrobblerService;
    librefm: ScrobblerService;
}

interface Player {
    setQuality(quality: string): void;
    applyReplayGain(): void;
    setPlaybackSpeed(speed: number): void;
}

interface VisualizerPresets {
    [key: string]: { loadPreset(name: string): void };
}

interface Visualizer {
    setPreset(preset: string): void;
    presets: VisualizerPresets;
}

interface SettingsApi {
    settings: {
        refreshInstances(): Promise<void>;
        getInstances(type: string): Promise<Array<unknown>>;
        saveInstances(instances: Array<unknown>, type: string): void;
    };
    clearCache(): Promise<void>;
}

interface SettingsUi {
    renderApiSettings(): void;
    visualizer?: Visualizer;
}

export function initializeSettings(scrobbler: Scrobbler, player: Player, api: SettingsApi, ui: SettingsUi): void {
    // Restore last active settings tab
    const savedTab = settingsUiState.getActiveTab();
    const settingsTab = document.querySelector(`.settings-tab[data-tab="${savedTab}"]`);
    if (settingsTab) {
        document.querySelectorAll('.settings-tab').forEach((t) => t.classList.remove('active'));
        document.querySelectorAll('.settings-tab-content').forEach((c) => c.classList.remove('active'));
        settingsTab.classList.add('active');
        document.getElementById(`settings-tab-${savedTab}`)?.classList.add('active');
    }

    // Initialize account system UI & Settings
    authManager.updateUI(authManager.user);

    // Email Auth UI Logic
    const toggleEmailBtn = document.getElementById('toggle-email-auth-btn') as HTMLButtonElement | null;
    const cancelEmailBtn = document.getElementById('cancel-email-auth-btn') as HTMLButtonElement | null;
    const authModal = document.getElementById('email-auth-modal');
    const emailInput = document.getElementById('auth-email') as HTMLInputElement | null;
    const passwordInput = document.getElementById('auth-password') as HTMLInputElement | null;
    const signInBtn = document.getElementById('email-signin-btn') as HTMLButtonElement | null;
    const signUpBtn = document.getElementById('email-signup-btn') as HTMLButtonElement | null;
    const resetPasswordBtn = document.getElementById('reset-password-btn') as HTMLButtonElement | null;

    if (toggleEmailBtn && authModal) {
        toggleEmailBtn.addEventListener('click', () => {
            authModal.classList.add('active');
        });
    }

    if (cancelEmailBtn && authModal) {
        cancelEmailBtn.addEventListener('click', () => {
            authModal.classList.remove('active');
        });

        authModal.querySelector('.modal-overlay')!.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
    }

    if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
            const email = emailInput?.value ?? '';
            const password = passwordInput?.value ?? '';
            if (!email || !password) {
                alert('Please enter both email and password.');
                return;
            }
            try {
                await authManager.signInWithEmail(email, password);
                authModal?.classList.remove('active');
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
            } catch {
                // Error handled in authManager
            }
        });
    }

    if (signUpBtn) {
        signUpBtn.addEventListener('click', async () => {
            const email = emailInput?.value ?? '';
            const password = passwordInput?.value ?? '';
            if (!email || !password) {
                alert('Please enter both email and password.');
                return;
            }
            try {
                await authManager.signUpWithEmail(email, password);
                authModal?.classList.remove('active');
                if (emailInput) emailInput.value = '';
                if (passwordInput) passwordInput.value = '';
            } catch {
                // Error handled in authManager
            }
        });
    }

    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', async () => {
            const email = emailInput?.value ?? '';
            if (!email) {
                alert('Please enter your email address to reset your password.');
                return;
            }
            try {
                await authManager.sendPasswordReset(email);
            } catch {
                /* ignore */
            }
        });
    }

    const lastfmConnectBtn = document.getElementById('lastfm-connect-btn') as HTMLButtonElement | null;
    const lastfmStatus = document.getElementById('lastfm-status');
    const lastfmToggle = document.getElementById('lastfm-toggle') as HTMLInputElement | null;
    const lastfmToggleSetting = document.getElementById('lastfm-toggle-setting');
    const lastfmLoveToggle = document.getElementById('lastfm-love-toggle') as HTMLInputElement | null;
    const lastfmLoveSetting = document.getElementById('lastfm-love-setting');
    const lastfmCustomCredsToggle = document.getElementById('lastfm-custom-creds-toggle') as HTMLInputElement | null;
    const lastfmCustomCredsToggleSetting = document.getElementById('lastfm-custom-creds-toggle-setting');
    const lastfmCustomCredsSetting = document.getElementById('lastfm-custom-creds-setting');
    const lastfmCustomApiKey = document.getElementById('lastfm-custom-api-key') as HTMLInputElement | null;
    const lastfmCustomApiSecret = document.getElementById('lastfm-custom-api-secret') as HTMLInputElement | null;
    const lastfmSaveCustomCreds = document.getElementById('lastfm-save-custom-creds') as HTMLButtonElement | null;
    const lastfmClearCustomCreds = document.getElementById('lastfm-clear-custom-creds') as HTMLButtonElement | null;
    const lastfmCredentialAuth = document.getElementById('lastfm-credential-auth');
    const lastfmCredentialForm = document.getElementById('lastfm-credential-form');
    const lastfmUsernameInput = document.getElementById('lastfm-username') as HTMLInputElement | null;
    const lastfmPasswordInput = document.getElementById('lastfm-password') as HTMLInputElement | null;
    const lastfmLoginCredentialsBtn = document.getElementById('lastfm-login-credentials') as HTMLButtonElement | null;
    const lastfmUseOAuthBtn = document.getElementById('lastfm-use-oauth') as HTMLButtonElement | null;

    function updateLastFMUI(): void {
        if (scrobbler.lastfm.isAuthenticated()) {
            if (lastfmStatus) lastfmStatus.textContent = `Connected as ${scrobbler.lastfm.username}`;
            if (lastfmConnectBtn) lastfmConnectBtn.textContent = 'Disconnect';
            if (lastfmConnectBtn) lastfmConnectBtn.classList.add('danger');
            if (lastfmToggleSetting) lastfmToggleSetting.style.display = 'flex';
            if (lastfmLoveSetting) lastfmLoveSetting.style.display = 'flex';
            if (lastfmToggle) lastfmToggle.checked = lastFMStorage.isEnabled();
            if (lastfmLoveToggle) lastfmLoveToggle.checked = lastFMStorage.shouldLoveOnLike();
            if (lastfmCustomCredsToggleSetting) lastfmCustomCredsToggleSetting.style.display = 'flex';
            if (lastfmCustomCredsToggle) lastfmCustomCredsToggle.checked = lastFMStorage.useCustomCredentials();
            updateCustomCredsUI();
            hideCredentialAuth();
        } else {
            if (lastfmStatus) lastfmStatus.textContent = 'Connect your Last.fm account to scrobble tracks';
            if (lastfmConnectBtn) lastfmConnectBtn.textContent = 'Connect Last.fm';
            if (lastfmConnectBtn) lastfmConnectBtn.classList.remove('danger');
            if (lastfmToggleSetting) lastfmToggleSetting.style.display = 'none';
            if (lastfmLoveSetting) lastfmLoveSetting.style.display = 'none';
            if (lastfmCustomCredsToggleSetting) lastfmCustomCredsToggleSetting.style.display = 'none';
            if (lastfmCustomCredsSetting) lastfmCustomCredsSetting.style.display = 'none';
            // Hide credential auth by default - only show on OAuth failure
            hideCredentialAuth();
        }
    }

    function showCredentialAuth(): void {
        if (lastfmCredentialAuth) lastfmCredentialAuth.style.display = 'block';
        if (lastfmCredentialForm) lastfmCredentialForm.style.display = 'block';
        // Focus on username field
        if (lastfmUsernameInput) lastfmUsernameInput.focus();
    }

    function hideCredentialAuth(): void {
        if (lastfmCredentialAuth) lastfmCredentialAuth.style.display = 'none';
        if (lastfmCredentialForm) lastfmCredentialForm.style.display = 'none';
        if (lastfmUsernameInput) lastfmUsernameInput.value = '';
        if (lastfmPasswordInput) lastfmPasswordInput.value = '';
    }

    function updateCustomCredsUI(): void {
        const useCustom = lastFMStorage.useCustomCredentials();
        if (lastfmCustomCredsSetting) lastfmCustomCredsSetting.style.display = useCustom ? 'flex' : 'none';

        if (useCustom) {
            if (lastfmCustomApiKey) lastfmCustomApiKey.value = lastFMStorage.getCustomApiKey();
            if (lastfmCustomApiSecret) lastfmCustomApiSecret.value = lastFMStorage.getCustomApiSecret();

            const hasCreds = lastFMStorage.getCustomApiKey() && lastFMStorage.getCustomApiSecret();
            if (lastfmClearCustomCreds) lastfmClearCustomCreds.style.display = hasCreds ? 'inline-block' : 'none';
        }
    }

    updateLastFMUI();

    lastfmConnectBtn?.addEventListener('click', async () => {
        if (scrobbler.lastfm.isAuthenticated()) {
            if (confirm('Disconnect from Last.fm?')) {
                scrobbler.lastfm.disconnect();
                updateLastFMUI();
            }
            return;
        }

        let authWindow: Window | null = null;
        if (!window.Neutralino) {
            authWindow = window.open('', '_blank');
        }

        (lastfmConnectBtn as HTMLButtonElement).disabled = true;
        lastfmConnectBtn!.textContent = 'Opening Last.fm...';

        try {
            const { token, url } = await scrobbler.lastfm.getAuthUrl();

            if (window.Neutralino) {
                try {
                    await Neutralino.os.open(url);
                } catch (e) {
                    // Fallback if os.open fails
                    console.error('Neutralino open failed, falling back to window.open', e);
                    if (!authWindow) authWindow = window.open(url, '_blank');
                    else authWindow.location.href = url;
                }
            } else if (authWindow) {
                authWindow.location.href = url;
            } else {
                alert('Popup blocked! Please allow popups.');
                lastfmConnectBtn.textContent = 'Connect Last.fm';
                (lastfmConnectBtn as HTMLButtonElement).disabled = false;
                return;
            }

            lastfmConnectBtn.textContent = 'Waiting for authorization...';

            let attempts = 0;
            const maxAttempts = 5;

            const checkAuth = setInterval(async () => {
                attempts++;

                if (attempts > maxAttempts) {
                    clearInterval(checkAuth);
                    if (authWindow && !authWindow.closed) authWindow.close();
                    lastfmConnectBtn.textContent = 'Connect Last.fm';
                    (lastfmConnectBtn as HTMLButtonElement).disabled = false;
                    // Ask user if they want to use credentials instead
                    if (
                        confirm('Authorization timed out. Would you like to login with username and password instead?')
                    ) {
                        showCredentialAuth();
                    }
                    return;
                }

                try {
                    const result = await scrobbler.lastfm.completeAuthentication(token);

                    if (result.success) {
                        clearInterval(checkAuth);
                        if (authWindow && !authWindow.closed) authWindow.close();
                        lastFMStorage.setEnabled(true);
                        if (lastfmToggle) lastfmToggle.checked = true;
                        updateLastFMUI();
                        (lastfmConnectBtn as HTMLButtonElement).disabled = false;
                    }
                } catch {
                    // Still waiting
                }
            }, 2000);
        } catch (error) {
            console.error('Last.fm connection failed:', error);
            if (authWindow && !authWindow.closed) authWindow.close();
            lastfmConnectBtn.textContent = 'Connect Last.fm';
            lastfmConnectBtn.disabled = false;
            // Ask user if they want to use credentials instead
            if (confirm('Failed to connect to Last.fm. Would you like to login with username and password instead?')) {
                showCredentialAuth();
            }
        }
    });

    // Last.fm Toggles
    if (lastfmToggle) {
        lastfmToggle.addEventListener('change', (e) => {
            lastFMStorage.setEnabled((e.target as HTMLInputElement).checked);
        });
    }

    if (lastfmLoveToggle) {
        lastfmLoveToggle.addEventListener('change', (e) => {
            lastFMStorage.setLoveOnLike((e.target as HTMLInputElement).checked);
        });
    }

    // Custom Credentials Toggle
    if (lastfmCustomCredsToggle) {
        lastfmCustomCredsToggle.addEventListener('change', (e) => {
            lastFMStorage.setUseCustomCredentials((e.target as HTMLInputElement).checked);
            updateCustomCredsUI();

            // Reload credentials in the scrobbler
            scrobbler.lastfm.reloadCredentials();

            // If credentials are being disabled, clear any existing session
            if (!(e.target as HTMLInputElement).checked && scrobbler.lastfm.isAuthenticated()) {
                scrobbler.lastfm.disconnect();
                updateLastFMUI();
                alert('Switched to default API credentials. Please reconnect to Last.fm.');
            }
        });
    }

    // Save Custom Credentials
    if (lastfmSaveCustomCreds) {
        lastfmSaveCustomCreds.addEventListener('click', () => {
            const apiKey = lastfmCustomApiKey?.value.trim() ?? '';
            const apiSecret = lastfmCustomApiSecret?.value.trim() ?? '';

            if (!apiKey || !apiSecret) {
                alert('Please enter both API Key and API Secret');
                return;
            }

            lastFMStorage.setCustomApiKey(apiKey);
            lastFMStorage.setCustomApiSecret(apiSecret);

            // Reload credentials
            scrobbler.lastfm.reloadCredentials();

            updateCustomCredsUI();
            alert('Custom API credentials saved! Please reconnect to Last.fm to use them.');

            // Disconnect current session if authenticated
            if (scrobbler.lastfm.isAuthenticated()) {
                scrobbler.lastfm.disconnect();
                updateLastFMUI();
            }
        });
    }

    // Clear Custom Credentials
    if (lastfmClearCustomCreds) {
        lastfmClearCustomCreds.addEventListener('click', () => {
            if (confirm('Clear custom API credentials?')) {
                lastFMStorage.clearCustomCredentials();
                if (lastfmCustomApiKey) lastfmCustomApiKey.value = '';
                if (lastfmCustomApiSecret) lastfmCustomApiSecret.value = '';
                if (lastfmCustomCredsToggle) lastfmCustomCredsToggle.checked = false;

                // Reload credentials
                scrobbler.lastfm.reloadCredentials();

                updateCustomCredsUI();

                // Disconnect current session if authenticated
                if (scrobbler.lastfm.isAuthenticated()) {
                    scrobbler.lastfm.disconnect();
                    updateLastFMUI();
                    alert(
                        'Custom credentials cleared. Switched to default API credentials. Please reconnect to Last.fm.'
                    );
                }
            }
        });
    }

    // Last.fm Credential Auth - Login with credentials
    if (lastfmLoginCredentialsBtn) {
        lastfmLoginCredentialsBtn.addEventListener('click', async () => {
            const username = lastfmUsernameInput?.value?.trim();
            const password = lastfmPasswordInput?.value;

            if (!username || !password) {
                alert('Please enter both username and password.');
                return;
            }

            (lastfmLoginCredentialsBtn as HTMLButtonElement).disabled = true;
            if (lastfmLoginCredentialsBtn) lastfmLoginCredentialsBtn.textContent = 'Logging in...';

            try {
                const result = await scrobbler.lastfm.authenticateWithCredentials(username, password);
                if (result.success) {
                    lastFMStorage.setEnabled(true);
                    if (lastfmToggle) lastfmToggle.checked = true;
                    updateLastFMUI();
                    // Clear password for security
                    if (lastfmPasswordInput) lastfmPasswordInput.value = '';
                }
            } catch (error) {
                console.error('Last.fm credential login failed:', error);
                alert('Failed to login: ' + (error instanceof Error ? error.message : String(error)));
            } finally {
                (lastfmLoginCredentialsBtn as HTMLButtonElement).disabled = false;
                if (lastfmLoginCredentialsBtn) lastfmLoginCredentialsBtn.textContent = 'Login';
            }
        });
    }

    // Last.fm Credential Auth - Switch back to OAuth
    if (lastfmUseOAuthBtn) {
        lastfmUseOAuthBtn.addEventListener('click', () => {
            hideCredentialAuth();
        });
    }

    // ========================================
    // Global Scrobble Settings
    // ========================================
    const scrobblePercentageSlider = document.getElementById('scrobble-percentage-slider') as HTMLInputElement | null;
    const scrobblePercentageInput = document.getElementById('scrobble-percentage-input') as HTMLInputElement | null;

    if (scrobblePercentageSlider && scrobblePercentageInput) {
        const percentage = lastFMStorage.getScrobblePercentage();
        scrobblePercentageSlider.value = String(percentage);
        scrobblePercentageInput.value = String(percentage);

        scrobblePercentageSlider.addEventListener('input', (e) => {
            const newPercentage = parseInt((e.target as HTMLInputElement).value, 10);
            scrobblePercentageInput.value = String(newPercentage);
            lastFMStorage.setScrobblePercentage(newPercentage);
        });

        scrobblePercentageInput.addEventListener('change', (e) => {
            let newPercentage = parseInt((e.target as HTMLInputElement).value, 10);
            newPercentage = Math.max(1, Math.min(100, newPercentage || 75));
            scrobblePercentageSlider.value = String(newPercentage);
            scrobblePercentageInput.value = String(newPercentage);
            lastFMStorage.setScrobblePercentage(newPercentage);
        });

        scrobblePercentageInput.addEventListener('input', (e) => {
            let newPercentage = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(newPercentage) && newPercentage >= 1 && newPercentage <= 100) {
                scrobblePercentageSlider.value = String(newPercentage);
                lastFMStorage.setScrobblePercentage(newPercentage);
            }
        });
    }

    // ========================================
    // ListenBrainz Settings
    // ========================================
    const lbToggle = document.getElementById('listenbrainz-enabled-toggle') as HTMLInputElement | null;
    const lbTokenSetting = document.getElementById('listenbrainz-token-setting');
    const lbCustomUrlSetting = document.getElementById('listenbrainz-custom-url-setting');
    const lbTokenInput = document.getElementById('listenbrainz-token-input') as HTMLInputElement | null;
    const lbCustomUrlInput = document.getElementById('listenbrainz-custom-url-input') as HTMLInputElement | null;

    const updateListenBrainzUI = (): void => {
        const isEnabled = listenBrainzSettings.isEnabled();
        if (lbToggle) lbToggle.checked = isEnabled;
        if (lbTokenSetting) lbTokenSetting.style.display = isEnabled ? 'flex' : 'none';
        if (lbCustomUrlSetting) lbCustomUrlSetting.style.display = isEnabled ? 'flex' : 'none';
        if (lbTokenInput) lbTokenInput.value = listenBrainzSettings.getToken();
        if (lbCustomUrlInput) lbCustomUrlInput.value = listenBrainzSettings.getCustomUrl();
    };

    updateListenBrainzUI();

    if (lbToggle) {
        lbToggle.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            listenBrainzSettings.setEnabled(enabled);
            updateListenBrainzUI();
        });
    }

    if (lbTokenInput) {
        lbTokenInput.addEventListener('change', (e) => {
            listenBrainzSettings.setToken((e.target as HTMLInputElement).value.trim());
        });
    }

    if (lbCustomUrlInput) {
        lbCustomUrlInput.addEventListener('change', (e) => {
            listenBrainzSettings.setCustomUrl((e.target as HTMLInputElement).value.trim());
        });
    }

    // ========================================
    // Maloja Settings
    // ========================================
    const malojaToggle = document.getElementById('maloja-enabled-toggle') as HTMLInputElement | null;
    const malojaTokenSetting = document.getElementById('maloja-token-setting');
    const malojaCustomUrlSetting = document.getElementById('maloja-custom-url-setting');
    const malojaTokenInput = document.getElementById('maloja-token-input') as HTMLInputElement | null;
    const malojaCustomUrlInput = document.getElementById('maloja-custom-url-input') as HTMLInputElement | null;

    const updateMalojaUI = (): void => {
        const isEnabled = malojaSettings.isEnabled();
        if (malojaToggle) malojaToggle.checked = isEnabled;
        if (malojaTokenSetting) malojaTokenSetting.style.display = isEnabled ? 'flex' : 'none';
        if (malojaCustomUrlSetting) malojaCustomUrlSetting.style.display = isEnabled ? 'flex' : 'none';
        if (malojaTokenInput) malojaTokenInput.value = malojaSettings.getToken();
        if (malojaCustomUrlInput) malojaCustomUrlInput.value = malojaSettings.getCustomUrl();
    };

    updateMalojaUI();

    if (malojaToggle) {
        malojaToggle.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            malojaSettings.setEnabled(enabled);
            updateMalojaUI();
        });
    }

    if (malojaTokenInput) {
        malojaTokenInput.addEventListener('change', (e) => {
            malojaSettings.setToken((e.target as HTMLInputElement).value.trim());
        });
    }

    if (malojaCustomUrlInput) {
        malojaCustomUrlInput.addEventListener('change', (e) => {
            malojaSettings.setCustomUrl((e.target as HTMLInputElement).value.trim());
        });
    }

    // ========================================
    // Libre.fm Settings
    // ========================================
    const librefmConnectBtn = document.getElementById('librefm-connect-btn') as HTMLButtonElement | null;
    const librefmStatus = document.getElementById('librefm-status');
    const librefmToggle = document.getElementById('librefm-toggle') as HTMLInputElement | null;
    const librefmToggleSetting = document.getElementById('librefm-toggle-setting');
    const librefmLoveToggle = document.getElementById('librefm-love-toggle') as HTMLInputElement | null;
    const librefmLoveSetting = document.getElementById('librefm-love-setting');

    function updateLibreFmUI(): void {
        if (scrobbler.librefm.isAuthenticated()) {
            if (librefmStatus) librefmStatus.textContent = `Connected as ${scrobbler.librefm.username}`;
            if (librefmConnectBtn) librefmConnectBtn.textContent = 'Disconnect';
            if (librefmConnectBtn) librefmConnectBtn.classList.add('danger');
            if (librefmToggleSetting) librefmToggleSetting.style.display = 'flex';
            if (librefmLoveSetting) librefmLoveSetting.style.display = 'flex';
            if (librefmToggle) librefmToggle.checked = libreFmSettings.isEnabled();
            if (librefmLoveToggle) librefmLoveToggle.checked = libreFmSettings.shouldLoveOnLike();
        } else {
            if (librefmStatus) librefmStatus.textContent = 'Connect your Libre.fm account to scrobble tracks';
            if (librefmConnectBtn) librefmConnectBtn.textContent = 'Connect Libre.fm';
            if (librefmConnectBtn) librefmConnectBtn.classList.remove('danger');
            if (librefmToggleSetting) librefmToggleSetting.style.display = 'none';
            if (librefmLoveSetting) librefmLoveSetting.style.display = 'none';
        }
    }

    if (librefmConnectBtn) {
        updateLibreFmUI();

        librefmConnectBtn.addEventListener('click', async () => {
            if (scrobbler.librefm.isAuthenticated()) {
                if (confirm('Disconnect from Libre.fm?')) {
                    scrobbler.librefm.disconnect();
                    updateLibreFmUI();
                }
                return;
            }

            let authWindow: Window | null = null;
            if (!window.Neutralino) {
                authWindow = window.open('', '_blank');
            }

            (librefmConnectBtn as HTMLButtonElement).disabled = true;
            librefmConnectBtn.textContent = 'Opening Libre.fm...';

            try {
                const { token, url } = await scrobbler.librefm.getAuthUrl();

                if (window.Neutralino) {
                    await Neutralino.os.open(url);
                } else if (authWindow) {
                    authWindow.location.href = url;
                } else {
                    alert('Popup blocked! Please allow popups.');
                    librefmConnectBtn.textContent = 'Connect Libre.fm';
                    (librefmConnectBtn as HTMLButtonElement).disabled = false;
                    return;
                }

                librefmConnectBtn.textContent = 'Waiting for authorization...';

                let attempts = 0;
                const maxAttempts = 30;

                const checkAuth = setInterval(async () => {
                    attempts++;

                    if (attempts > maxAttempts) {
                        clearInterval(checkAuth);
                        librefmConnectBtn.textContent = 'Connect Libre.fm';
                        (librefmConnectBtn as HTMLButtonElement).disabled = false;
                        if (authWindow && !authWindow.closed) authWindow.close();
                        alert('Authorization timed out. Please try again.');
                        return;
                    }

                    try {
                        const result = await scrobbler.librefm.completeAuthentication(token);

                        if (result.success) {
                            clearInterval(checkAuth);
                            if (authWindow && !authWindow.closed) authWindow.close();
                            libreFmSettings.setEnabled(true);
                            if (librefmToggle) librefmToggle.checked = true;
                            updateLibreFmUI();
                            (librefmConnectBtn as HTMLButtonElement).disabled = false;
                            alert(`Successfully connected to Libre.fm as ${result.username}!`);
                        }
                    } catch {
                        // Still waiting
                    }
                }, 2000);
            } catch (error) {
                console.error('Libre.fm connection failed:', error);
                alert('Failed to connect to Libre.fm: ' + (error instanceof Error ? error.message : String(error)));
                librefmConnectBtn.textContent = 'Connect Libre.fm';
                (librefmConnectBtn as HTMLButtonElement).disabled = false;
                if (authWindow && !authWindow.closed) authWindow.close();
            }
        });

        // Libre.fm Toggles
        if (librefmToggle) {
            librefmToggle.addEventListener('change', (e) => {
                libreFmSettings.setEnabled((e.target as HTMLInputElement).checked);
            });
        }

        if (librefmLoveToggle) {
            librefmLoveToggle.addEventListener('change', (e) => {
                libreFmSettings.setLoveOnLike((e.target as HTMLInputElement).checked);
            });
        }
    }

    // Theme picker
    const themePicker = document.getElementById('theme-picker');
    const currentTheme = themeManager.getTheme();

    themePicker!.querySelectorAll('.theme-option').forEach((option) => {
        const htmlOption = option as HTMLElement;
        if (htmlOption.dataset.theme === currentTheme) {
            option.classList.add('active');
        }

        option.addEventListener('click', () => {
            const theme = htmlOption.dataset.theme;

            themePicker!.querySelectorAll('.theme-option').forEach((opt) => opt.classList.remove('active'));
            option.classList.add('active');

            if (theme === 'custom') {
                document.getElementById('custom-theme-editor')?.classList.add('show');
                renderCustomThemeEditor();
                themeManager.setTheme('custom');
            } else {
                document.getElementById('custom-theme-editor')?.classList.remove('show');
                themeManager.setTheme(theme ?? 'system');
            }
        });
    });

    const communityThemeContainer = document.getElementById('applied-community-theme-container');
    const communityThemeBtn = document.getElementById('applied-community-theme-btn') as HTMLButtonElement | null;
    const communityThemeDetails = document.getElementById('community-theme-details-panel');
    const communityThemeUnapplyBtn = document.getElementById('ct-unapply-btn') as HTMLButtonElement | null;
    const appliedThemeName = document.getElementById('applied-theme-name');
    const ctDetailsTitle = document.getElementById('ct-details-title');
    const ctDetailsAuthor = document.getElementById('ct-details-author');

    function updateCommunityThemeUI(): void {
        const metadataStr = localStorage.getItem('community-theme');
        if (metadataStr) {
            try {
                const metadata = JSON.parse(metadataStr);
                if (communityThemeContainer) communityThemeContainer.style.display = 'block';
                if (appliedThemeName) appliedThemeName.textContent = metadata.name;
                if (ctDetailsTitle) ctDetailsTitle.textContent = metadata.name;
                if (ctDetailsAuthor) ctDetailsAuthor.textContent = `by ${metadata.author}`;
            } catch {
                if (communityThemeContainer) communityThemeContainer.style.display = 'none';
            }
        } else {
            if (communityThemeContainer) communityThemeContainer.style.display = 'none';
            if (communityThemeDetails) communityThemeDetails.style.display = 'none';
        }
    }

    updateCommunityThemeUI();
    window.addEventListener('theme-changed', updateCommunityThemeUI);

    if (communityThemeBtn) {
        communityThemeBtn.addEventListener('click', () => {
            const isVisible = communityThemeDetails?.style.display === 'block';
            if (communityThemeDetails) communityThemeDetails.style.display = isVisible ? 'none' : 'block';
        });
    }

    if (communityThemeUnapplyBtn) {
        communityThemeUnapplyBtn.addEventListener('click', () => {
            if (confirm('Unapply this community theme?')) {
                localStorage.removeItem('custom_theme_css');
                localStorage.removeItem('community-theme');
                const styleEl = document.getElementById('custom-theme-style');
                if (styleEl) styleEl.remove();
                themeManager.setTheme('system');

                const themePickerInner = document.getElementById('theme-picker');
                if (themePickerInner) {
                    themePickerInner.querySelectorAll('.theme-option').forEach((opt) => opt.classList.remove('active'));
                    themePickerInner.querySelector('[data-theme="system"]')?.classList.add('active');
                }
                document.getElementById('custom-theme-editor')?.classList.remove('show');
            }
        });
    }

    function renderCustomThemeEditor(): void {
        const grid = document.getElementById('theme-color-grid');
        const customTheme = themeManager.getCustomTheme() || {
            background: '#000000',
            foreground: '#fafafa',
            primary: '#ffffff',
            secondary: '#27272a',
            muted: '#27272a',
            border: '#27272a',
            highlight: '#ffffff',
        };

        grid!.innerHTML = Object.entries(customTheme)
            .map(
                ([key, value]) => `
            <div class="theme-color-input">
                <label>${key}</label>
                <input type="color" data-color="${key}" value="${value}">
            </div>
        `
            )
            .join('');
    }

    document.getElementById('apply-custom-theme')?.addEventListener('click', () => {
        const colors: Record<string, string> = {};
        document.querySelectorAll('#theme-color-grid input[type="color"]').forEach((input) => {
            colors[(input as HTMLInputElement).dataset.color!] = (input as HTMLInputElement).value;
        });
        themeManager.setCustomTheme(colors);
    });

    document.getElementById('reset-custom-theme')?.addEventListener('click', () => {
        renderCustomThemeEditor();
    });

    // Music Provider setting
    const musicProviderSetting = document.getElementById('music-provider-setting') as HTMLSelectElement | null;
    if (musicProviderSetting) {
        musicProviderSetting.value = musicProviderSettings.getProvider();
        musicProviderSetting.addEventListener('change', (e) => {
            musicProviderSettings.setProvider((e.target as HTMLInputElement).value);
            // Reload page to apply changes
            window.location.reload();
        });
    }

    // Streaming Quality setting
    const streamingQualitySetting = document.getElementById('streaming-quality-setting') as HTMLSelectElement | null;
    if (streamingQualitySetting) {
        const savedQuality = localStorage.getItem('playback-quality') || 'HI_RES_LOSSLESS';
        streamingQualitySetting.value = savedQuality;
        player.setQuality(savedQuality);

        streamingQualitySetting.addEventListener('change', (e) => {
            const newQuality = (e.target as HTMLInputElement).value;
            player.setQuality(newQuality);
            localStorage.setItem('playback-quality', newQuality);
        });
    }

    // Download Quality setting
    const downloadQualitySetting = document.getElementById('download-quality-setting') as HTMLSelectElement | null;
    if (downloadQualitySetting) {
        downloadQualitySetting.value = downloadQualitySettings.getQuality();

        downloadQualitySetting.addEventListener('change', (e) => {
            downloadQualitySettings.setQuality((e.target as HTMLInputElement).value);
        });
    }

    const losslessContainerSetting = document.getElementById('lossless-container-setting') as HTMLSelectElement | null;
    if (losslessContainerSetting) {
        losslessContainerSetting.value = losslessContainerSettings.getContainer();

        losslessContainerSetting.addEventListener('change', (e) => {
            losslessContainerSettings.setContainer((e.target as HTMLInputElement).value);
        });
    }

    // Cover Art Size setting
    const coverArtSizeSetting = document.getElementById('cover-art-size-setting') as HTMLSelectElement | null;
    if (coverArtSizeSetting) {
        coverArtSizeSetting.value = coverArtSizeSettings.getSize();

        coverArtSizeSetting.addEventListener('change', (e) => {
            coverArtSizeSettings.setSize((e.target as HTMLInputElement).value);
        });
    }

    // Quality Badge Settings
    const showQualityBadgesToggle = document.getElementById('show-quality-badges-toggle') as HTMLInputElement | null;
    if (showQualityBadgesToggle) {
        showQualityBadgesToggle.checked = qualityBadgeSettings.isEnabled();
        showQualityBadgesToggle.addEventListener('change', (e) => {
            qualityBadgeSettings.setEnabled((e.target as HTMLInputElement).checked);
            // Re-render queue if available, but don't force navigation to library
            if (window.renderQueueFunction) (window.renderQueueFunction as () => void)();
        });
    }

    // Track Date Settings
    const useAlbumReleaseYearToggle = document.getElementById('use-album-release-year-toggle') as HTMLInputElement | null;
    if (useAlbumReleaseYearToggle) {
        useAlbumReleaseYearToggle.checked = trackDateSettings.useAlbumYear();
        useAlbumReleaseYearToggle.addEventListener('change', (e) => {
            trackDateSettings.setUseAlbumYear((e.target as HTMLInputElement).checked);
        });
    }

    const zippedBulkDownloadsToggle = document.getElementById('zipped-bulk-downloads-toggle') as HTMLInputElement | null;
    if (zippedBulkDownloadsToggle) {
        zippedBulkDownloadsToggle.checked = !bulkDownloadSettings.shouldForceIndividual();
        zippedBulkDownloadsToggle.addEventListener('change', (e) => {
            bulkDownloadSettings.setForceIndividual(!(e.target as HTMLInputElement).checked);
        });
    }

    // ReplayGain Settings
    const replayGainMode = document.getElementById('replay-gain-mode') as HTMLSelectElement | null;
    if (replayGainMode) {
        replayGainMode.value = replayGainSettings.getMode();
        replayGainMode.addEventListener('change', (e) => {
            replayGainSettings.setMode((e.target as HTMLInputElement).value);
            player.applyReplayGain();
        });
    }

    const replayGainPreamp = document.getElementById('replay-gain-preamp') as HTMLInputElement | null;
    if (replayGainPreamp) {
        replayGainPreamp.value = String(replayGainSettings.getPreamp());
        replayGainPreamp.addEventListener('change', (e) => {
            replayGainSettings.setPreamp(parseFloat((e.target as HTMLInputElement).value) || 3);
            player.applyReplayGain();
        });
    }

    // Mono Audio Toggle
    const monoAudioToggle = document.getElementById('mono-audio-toggle') as HTMLInputElement | null;
    if (monoAudioToggle) {
        monoAudioToggle.checked = monoAudioSettings.isEnabled();
        monoAudioToggle.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            monoAudioSettings.setEnabled(enabled);
            audioContextManager.toggleMonoAudio(enabled);
        });
    }

    // Exponential Volume Toggle
    const exponentialVolumeToggle = document.getElementById('exponential-volume-toggle') as HTMLInputElement | null;
    if (exponentialVolumeToggle) {
        exponentialVolumeToggle.checked = exponentialVolumeSettings.isEnabled();
        exponentialVolumeToggle.addEventListener('change', (e) => {
            exponentialVolumeSettings.setEnabled((e.target as HTMLInputElement).checked);
            // Re-apply current volume to use new curve
            player.applyReplayGain();
        });
    }

    // ========================================
    // Audio Effects (Playback Speed)
    // ========================================
    const playbackSpeedSlider = document.getElementById('playback-speed-slider') as HTMLInputElement | null;
    const playbackSpeedInput = document.getElementById('playback-speed-input') as HTMLInputElement | null;
    if (playbackSpeedSlider && playbackSpeedInput) {
        const currentSpeed = audioEffectsSettings.getSpeed();
        // Clamp slider to its range (0.25-4), but show actual value in input
        playbackSpeedSlider.value = String(Math.max(0.25, Math.min(4.0, currentSpeed)));
        playbackSpeedInput.value = String(currentSpeed);

        // Slider only controls 0.25-4 range
        playbackSpeedSlider.addEventListener('input', (e) => {
            const speed = parseFloat((e.target as HTMLInputElement).value) || 1.0;
            playbackSpeedInput.value = String(speed);
            player.setPlaybackSpeed(speed);
        });

        // Input allows full 0.01-100 range
        const handleInputChange = (): void => {
            const speed = parseFloat(playbackSpeedInput.value) || 1.0;
            const validSpeed = Math.max(0.01, Math.min(100, speed));
            playbackSpeedInput.value = String(validSpeed);
            // Only update slider if value is within slider range
            if (validSpeed >= 0.25 && validSpeed <= 4.0) {
                playbackSpeedSlider.value = String(validSpeed);
            }
            player.setPlaybackSpeed(validSpeed);
        };

        playbackSpeedInput.addEventListener('change', handleInputChange);
        playbackSpeedInput.addEventListener('blur', handleInputChange);
    }

    // ========================================
    // Parametric Equalizer Settings (3-32 bands with custom ranges)
    // ========================================
    const eqToggle = document.getElementById('equalizer-enabled-toggle') as HTMLInputElement | null;
    const eqContainer = document.getElementById('equalizer-container');
    const eqPresetSelect = document.getElementById('equalizer-preset-select') as HTMLSelectElement | null;
    const eqResetBtn = document.getElementById('equalizer-reset-btn') as HTMLButtonElement | null;
    const eqBandsContainer = document.getElementById('equalizer-bands');
    const customPresetsOptgroup = document.getElementById('custom-presets-optgroup');
    const customPresetNameInput = document.getElementById('custom-preset-name') as HTMLInputElement | null;
    const saveCustomPresetBtn = document.getElementById('save-custom-preset-btn') as HTMLButtonElement | null;
    const deleteCustomPresetBtn = document.getElementById('delete-custom-preset-btn') as HTMLButtonElement | null;
    const eqBandCountInput = document.getElementById('eq-band-count') as HTMLInputElement | null;
    const eqRangeMinInput = document.getElementById('eq-range-min') as HTMLInputElement | null;
    const eqRangeMaxInput = document.getElementById('eq-range-max') as HTMLInputElement | null;
    const applyEqRangeBtn = document.getElementById('apply-eq-range-btn') as HTMLButtonElement | null;
    const eqFreqMinInput = document.getElementById('eq-freq-min') as HTMLInputElement | null;
    const eqFreqMaxInput = document.getElementById('eq-freq-max') as HTMLInputElement | null;
    const applyEqFreqBtn = document.getElementById('apply-eq-freq-btn') as HTMLButtonElement | null;
    const resetEqFreqBtn = document.getElementById('reset-eq-freq-btn') as HTMLButtonElement | null;
    const resetEqRangeBtn = document.getElementById('reset-eq-range-btn') as HTMLButtonElement | null;
    const eqScaleContainer = document.querySelector('.equalizer-scale');
    const eqPreampSlider = document.getElementById('eq-preamp-slider') as HTMLInputElement | null;
    const eqPreampInput = document.getElementById('eq-preamp-input') as HTMLInputElement | null;
    const eqExportBtn = document.getElementById('eq-export-btn') as HTMLButtonElement | null;
    const eqImportBtn = document.getElementById('eq-import-btn') as HTMLButtonElement | null;
    const eqImportFile = document.getElementById('eq-import-file') as HTMLInputElement | null;

    // Current settings
    let currentBandCount = equalizerSettings.getBandCount();
    let currentRange = equalizerSettings.getRange();
    let currentFreqRange = equalizerSettings.getFreqRange();
    let currentPreamp = equalizerSettings.getPreamp();

    /**
     * Generate frequency labels for given band count and frequency range
     */
    const generateFreqLabels = (count: number, minFreq: number = currentFreqRange.min, maxFreq: number = currentFreqRange.max): string[] => {
        const labels = [];
        const safeMin = Math.max(10, minFreq);
        const safeMax = Math.min(96000, maxFreq);

        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const freq = safeMin * Math.pow(safeMax / safeMin, t);
            const rounded = Math.round(freq);

            if (rounded < 1000) {
                labels.push(rounded.toString());
            } else if (rounded < 10000) {
                labels.push((rounded / 1000).toFixed(rounded % 1000 === 0 ? 0 : 1) + 'K');
            } else {
                labels.push((rounded / 1000).toFixed(0) + 'K');
            }
        }

        return labels;
    };

    /**
     * Generate EQ bands HTML
     */
    const generateEQBands = (
        count: number,
        rangeMin: number = currentRange.min,
        rangeMax: number = currentRange.max,
        freqMin: number = currentFreqRange.min,
        freqMax: number = currentFreqRange.max
    ): void => {
        if (!eqBandsContainer) return;

        const labels = generateFreqLabels(count, freqMin, freqMax);
        eqBandsContainer.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const bandEl = document.createElement('div');
            bandEl.className = 'eq-band';
            bandEl.dataset.band = String(i);

            bandEl.innerHTML = `
                <input
                    type="range"
                    class="eq-slider"
                    min="${rangeMin}"
                    max="${rangeMax}"
                    step="0.5"
                    value="0"
                    orient="vertical"
                />
                <span class="eq-value">0</span>
                <span class="eq-freq">${labels[i]}</span>
            `;

            eqBandsContainer.appendChild(bandEl);
        }

        // Re-initialize band sliders
        initializeBandSliders();
    };

    /**
     * Update EQ scale display
     */
    const updateEQScale = (min: number, max: number): void => {
        if (!eqScaleContainer) return;
        const spans = eqScaleContainer.querySelectorAll('span');
        if (spans.length >= 3) {
            spans[0].textContent = `+${max} dB`;
            spans[1].textContent = '0 dB';
            spans[2].textContent = `${min} dB`;
        }
    };

    /**
     * Update the visual display of a band value
     */
    const updateBandValueDisplay = (bandEl: Element, value: number): void => {
        const valueEl = bandEl.querySelector('.eq-value');
        if (!valueEl) return;

        const displayValue = value > 0 ? `+${value}` : value.toString();
        valueEl.textContent = displayValue;

        // Add color classes based on value
        valueEl.classList.remove('positive', 'negative');
        if (value > 0) {
            valueEl.classList.add('positive');
        } else if (value < 0) {
            valueEl.classList.add('negative');
        }
    };

    /**
     * Update all band sliders and displays from an array of gains
     */
    const updateAllBandUI = (gains: number[]): void => {
        const eqBands = eqBandsContainer?.querySelectorAll('.eq-band');
        if (!eqBands) return;

        eqBands.forEach((bandEl, index) => {
            const slider = bandEl.querySelector('.eq-slider') as HTMLInputElement | null;
            if (slider && gains[index] !== undefined) {
                slider.value = String(gains[index]);
                updateBandValueDisplay(bandEl, gains[index]);
            }
        });

        // Redraw the EQ curve after updating all bands
        drawEQCurve();
    };

    /**
     * Toggle EQ container visibility
     */
    const updateEQContainerVisibility = (enabled: boolean): void => {
        if (eqContainer) {
            eqContainer.style.display = enabled ? 'block' : 'none';
            if (enabled) {
                // Redraw curve when container becomes visible
                requestAnimationFrame(drawEQCurve);
            }
        }
    };

    /**
     * Populate custom presets in the dropdown
     */
    const populateCustomPresets = (): void => {
        if (!customPresetsOptgroup) return;

        // Clear existing custom presets
        customPresetsOptgroup.innerHTML = '';

        const customPresets = equalizerSettings.getCustomPresets();
        const presetIds = Object.keys(customPresets);

        if (presetIds.length === 0) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = 'No custom presets saved';
            emptyOption.disabled = true;
            customPresetsOptgroup.appendChild(emptyOption);
        } else {
            presetIds.forEach((presetId) => {
                const preset = customPresets[presetId];
                const option = document.createElement('option');
                option.value = presetId;
                option.textContent = preset.name;
                customPresetsOptgroup.appendChild(option);
            });
        }
    };

    /**
     * Check if a preset ID is a custom preset
     */
    const isCustomPreset = (presetId: string): boolean => {
        return !!presetId && presetId.startsWith('custom_');
    };

    /**
     * Update delete button visibility based on selected preset
     */
    const updateDeleteButtonVisibility = (): void => {
        if (!deleteCustomPresetBtn || !eqPresetSelect) return;
        const isCustom = isCustomPreset(eqPresetSelect.value);
        deleteCustomPresetBtn.style.display = isCustom ? 'flex' : 'none';
    };

    /**
     * Draw smooth EQ response curve on canvas
     */
    const drawEQCurve = (): void => {
        const canvas = document.getElementById('eq-response-canvas') as HTMLCanvasElement | null;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        // Skip if canvas has no size (not visible yet)
        if (rect.width === 0 || rect.height === 0) return;

        // Set canvas size accounting for DPR
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get all current gain values
        const eqBands = eqBandsContainer?.querySelectorAll('.eq-band');
        if (!eqBands || eqBands.length === 0) return;

        // Get the actual highlight color from CSS
        const tempEl = document.createElement('div');
        tempEl.style.color = 'rgb(var(--highlight-rgb))';
        document.body.appendChild(tempEl);
        const highlightColor = getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);

        const gains: number[] = [];
        const positions: number[] = [];
        const range = currentRange;
        const rangeTotal = range.max - range.min;
        const canvasRect = canvas.getBoundingClientRect();

        eqBands.forEach((bandEl) => {
            const slider = bandEl.querySelector('.eq-slider') as HTMLInputElement | null;
            const gain = slider ? parseFloat(slider.value) : 0;
            gains.push(gain);

            // Get actual center position of the band element relative to canvas
            const bandRect = bandEl.getBoundingClientRect();
            const x = bandRect.left + bandRect.width / 2 - canvasRect.left;
            positions.push(x);
        });

        // Calculate y positions - account for slider thumb size (18px)
        // The track is 120px, but thumb center moves within (120 - 18) = 102px range
        const trackHeight = height;
        const thumbSize = 18;
        const usableTrack = trackHeight - thumbSize;
        const trackOffset = thumbSize / 2;

        const getY = (gain: number): number => {
            const normalized = (gain - range.min) / rangeTotal;
            // Invert because canvas Y=0 is at top, slider max is at top
            return trackOffset + (1 - normalized) * usableTrack;
        };

        // Create points array
        const points = gains.map((gain, i) => ({
            x: positions[i],
            y: getY(gain),
        }));

        if (points.length < 2) return;

        // Parse RGB values from color string
        const rgbMatch = highlightColor.match(/\d+/g);
        const r = rgbMatch ? parseInt(rgbMatch[0]) : 128;
        const g = rgbMatch ? parseInt(rgbMatch[1]) : 128;
        const b = rgbMatch ? parseInt(rgbMatch[2]) : 128;

        // Calculate control points for smooth curve
        const getControlPoints = (i: number): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } => {
            const p0 = points[i === 0 ? i : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            return { cp1x, cp1y, cp2x, cp2y };
        };

        // Draw filled area from curve to bottom
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);

        ctx.beginPath();
        ctx.moveTo(points[0].x, height);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(i);
            const p2 = points[i + 1];
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }

        ctx.lineTo(points[points.length - 1].x, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw the curve line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const { cp1x, cp1y, cp2x, cp2y } = getControlPoints(i);
            const p2 = points[i + 1];
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }

        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw dots at each band point
        points.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fill();

            // Add white center to dots for visibility
            ctx.beginPath();
            ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        });
    };

    /**
     * Initialize band slider event listeners
     */
    const initializeBandSliders = (): void => {
        const eqBands = eqBandsContainer?.querySelectorAll('.eq-band');
        if (!eqBands || eqBands.length === 0) return;

        const savedGains = equalizerSettings.getGains(currentBandCount);

        // FL Studio-style absolute position drag state
        let isDragging = false;

        eqBands.forEach((bandEl) => {
            const bandIndex = parseInt((bandEl as HTMLElement).dataset.band ?? '0', 10);
            const slider = bandEl.querySelector('.eq-slider') as HTMLInputElement | null;

            if (slider && !isNaN(bandIndex)) {
                // Set initial value from saved settings
                const initialGain = savedGains[bandIndex] ?? 0;
                slider.value = String(initialGain);
                updateBandValueDisplay(bandEl, initialGain);

                // Handle slider input
                slider.addEventListener('input', (e) => {
                    const gain = parseFloat((e.target as HTMLInputElement).value);
                    audioContextManager.setBandGain(bandIndex, gain);
                    updateBandValueDisplay(bandEl, gain);
                    drawEQCurve();

                    // When manually adjusting, check if we should clear preset
                    if (eqPresetSelect && eqPresetSelect.value !== 'flat') {
                        const currentGains = audioContextManager.getGains();
                        const builtInPresets = EQ_PRESETS;
                        const currentPreset = builtInPresets[eqPresetSelect.value as keyof typeof builtInPresets];
                        if (currentPreset) {
                            const matches = currentPreset.gains.every((g, i) => Math.abs(g - currentGains[i]) < 0.01);
                            if (!matches) {
                                // User has deviated from preset
                            }
                        }
                    }
                });

                // Double-click to reset individual band to 0
                slider.addEventListener('dblclick', () => {
                    slider.value = "0";
                    audioContextManager.setBandGain(bandIndex, 0);
                    updateBandValueDisplay(bandEl, 0);
                    drawEQCurve();
                });

                // FL Studio-style absolute drag: mousedown starts drag mode
                (bandEl as HTMLElement).addEventListener('mousedown', (e: MouseEvent) => {
                    // Only handle left mouse button
                    if (e.button !== 0) return;

                    isDragging = true;
                    document.body.style.cursor = 'ns-resize';
                    e.preventDefault();
                });
            }
        });

        // Global mousemove: whichever band is under cursor, set slider to cursor Y position
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            // Find which band is under the cursor
            const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
            const bandUnderCursor = elementUnderCursor?.closest('.eq-band');

            if (bandUnderCursor) {
                const slider = bandUnderCursor.querySelector('.eq-slider') as HTMLInputElement | null;

                if (slider) {
                    const rect = slider.getBoundingClientRect();
                    const min = parseFloat(slider.min);
                    const max = parseFloat(slider.max);
                    const step = parseFloat(slider.step) || 0.5;

                    // Calculate relative Y position within slider (0 = bottom, 1 = top)
                    const relativeY = (rect.bottom - e.clientY) / rect.height;
                    const clampedY = Math.max(0, Math.min(1, relativeY));

                    // Map to slider value range
                    let newValue = min + clampedY * (max - min);

                    // Round to step
                    newValue = Math.round(newValue / step) * step;

                    // Only update if value changed
                    if (parseFloat(slider.value) !== newValue) {
                        slider.value = String(newValue);
                        const bandIndex = parseInt((bandUnderCursor as HTMLElement).dataset.band ?? '0', 10);
                        audioContextManager.setBandGain(bandIndex, newValue);
                        updateBandValueDisplay(bandUnderCursor, newValue);
                        drawEQCurve();
                    }
                }
            }
        });

        // Global mouseup: stop dragging
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
            }
        });

        // Initial curve draw with delay to ensure canvas has proper dimensions
        setTimeout(() => {
            drawEQCurve();
        }, 100);
    };

    // Initialize EQ toggle
    if (eqToggle) {
        const isEnabled = equalizerSettings.isEnabled();
        eqToggle.checked = isEnabled;
        updateEQContainerVisibility(isEnabled);

        eqToggle.addEventListener('change', (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            audioContextManager.toggleEQ(enabled);
            updateEQContainerVisibility(enabled);

            // Redraw curve after a brief delay to allow container to become visible
            if (enabled) {
                setTimeout(() => {
                    drawEQCurve();
                }, 50);
            }
        });
    }

    // Initialize band count input
    if (eqBandCountInput) {
        eqBandCountInput.value = String(currentBandCount);

        eqBandCountInput.addEventListener('change', (e) => {
            const newCount = parseInt((e.target as HTMLInputElement).value, 10);
            if (newCount >= equalizerSettings.MIN_BANDS && newCount <= equalizerSettings.MAX_BANDS) {
                currentBandCount = newCount;

                // Save new band count and update audio context (interpolates gains automatically)
                equalizerSettings.setBandCount(newCount);
                audioContextManager.setBandCount?.(newCount);

                // Regenerate UI
                generateEQBands(
                    newCount,
                    currentRange.min,
                    currentRange.max,
                    currentFreqRange.min,
                    currentFreqRange.max
                );

                // Get interpolated gains from audio context
                const interpolatedGains = audioContextManager.getGains?.() || equalizerSettings.getGains(newCount);
                updateAllBandUI(interpolatedGains);

                // Keep current preset or set to custom if modified
                if (eqPresetSelect) {
                    const currentPreset = eqPresetSelect.value;
                    if (!currentPreset.startsWith('custom_')) {
                        eqPresetSelect.value = 'custom';
                    }
                }
                updateDeleteButtonVisibility();

                // Show brief feedback
                const originalText = eqBandCountInput.style.backgroundColor;
                eqBandCountInput.style.backgroundColor = 'var(--highlight)';
                setTimeout(() => {
                    eqBandCountInput.style.backgroundColor = originalText;
                }, 300);
            }
        });
    }

    // Initialize preset selector
    if (eqPresetSelect) {
        populateCustomPresets();
        eqPresetSelect.value = equalizerSettings.getPreset();
        updateDeleteButtonVisibility();

        eqPresetSelect.addEventListener('change', (e) => {
            const presetKey = (e.target as HTMLInputElement).value;

            // Check if it's a custom preset
            if (isCustomPreset(presetKey)) {
                const customPresets = equalizerSettings.getCustomPresets();
                const customPreset = customPresets[presetKey];
                if (customPreset && customPreset.gains) {
                    // Check if preset has different band count
                    const presetBands = customPreset.bandCount || customPreset.gains.length;
                    if (presetBands !== currentBandCount) {
                        // Update band count to match preset
                        currentBandCount = presetBands;
                        equalizerSettings.setBandCount(presetBands);
                        if (eqBandCountInput) eqBandCountInput.value = String(presetBands);
                        generateEQBands(
                            presetBands,
                            currentRange.min,
                            currentRange.max,
                            currentFreqRange.min,
                            currentFreqRange.max
                        );
                    }
                    audioContextManager.setAllGains(customPreset.gains);
                    updateAllBandUI(customPreset.gains);
                    equalizerSettings.setPreset(presetKey);
                }
            } else {
                // Built-in preset - use current band count
                const presets = EQ_PRESETS;
                const preset = presets[presetKey as keyof typeof presets];
                if (preset) {
                    audioContextManager.applyPreset(presetKey);
                    updateAllBandUI(preset.gains);
                }
            }
            updateDeleteButtonVisibility();
        });
    }

    // Initialize reset button
    if (eqResetBtn) {
        eqResetBtn.addEventListener('click', () => {
            audioContextManager.reset();
            updateAllBandUI(new Array(currentBandCount).fill(0));
            if (eqPresetSelect) {
                eqPresetSelect.value = 'flat';
                updateDeleteButtonVisibility();
            }
        });
    }

    // Initialize save custom preset button
    if (saveCustomPresetBtn && customPresetNameInput) {
        saveCustomPresetBtn.addEventListener('click', () => {
            const name = customPresetNameInput.value.trim();
            if (!name) {
                alert('Please enter a name for your preset');
                return;
            }

            const currentGains = audioContextManager.getGains();
            const presetId = equalizerSettings.saveCustomPreset(name, currentGains);

            if (presetId) {
                populateCustomPresets();
                if (eqPresetSelect) {
                    eqPresetSelect.value = presetId;
                    equalizerSettings.setPreset(presetId);
                    updateDeleteButtonVisibility();
                }
                customPresetNameInput.value = '';

                // Show feedback
                const originalText = saveCustomPresetBtn.textContent;
                saveCustomPresetBtn.textContent = 'Saved!';
                setTimeout(() => {
                    saveCustomPresetBtn.textContent = originalText;
                }, 1500);
            } else {
                alert('Failed to save preset. Please try again.');
            }
        });

        // Allow saving with Enter key
        customPresetNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveCustomPresetBtn.click();
            }
        });
    }

    // Initialize delete custom preset button
    if (deleteCustomPresetBtn) {
        deleteCustomPresetBtn.addEventListener('click', () => {
            if (!eqPresetSelect) return;

            const presetId = eqPresetSelect.value;
            if (!isCustomPreset(presetId)) return;

            const customPresets = equalizerSettings.getCustomPresets();
            const presetName = customPresets[presetId]?.name || 'this preset';

            if (confirm(`Are you sure you want to delete "${presetName}"?`)) {
                const success = equalizerSettings.deleteCustomPreset(presetId);
                if (success) {
                    populateCustomPresets();
                    eqPresetSelect.value = 'flat';
                    audioContextManager.reset();
                    updateAllBandUI(new Array(currentBandCount).fill(0));
                    equalizerSettings.setPreset('flat');
                    updateDeleteButtonVisibility();
                } else {
                    alert('Failed to delete preset. Please try again.');
                }
            }
        });
    }

    // Initialize range inputs
    if (eqRangeMinInput) {
        eqRangeMinInput.value = String(currentRange.min);
    }
    if (eqRangeMaxInput) {
        eqRangeMaxInput.value = String(currentRange.max);
    }
    updateEQScale(currentRange.min, currentRange.max);

    // Initialize apply range button
    if (applyEqRangeBtn && eqRangeMinInput && eqRangeMaxInput) {
        applyEqRangeBtn.addEventListener('click', () => {
            const newMin = parseInt(eqRangeMinInput.value, 10);
            const newMax = parseInt(eqRangeMaxInput.value, 10);

            // Validate range
            if (isNaN(newMin) || isNaN(newMax)) {
                alert('Please enter valid numbers for the range');
                return;
            }

            if (newMin >= 0 || newMax <= 0) {
                alert('Minimum must be negative and maximum must be positive');
                return;
            }

            if (newMin < equalizerSettings.ABSOLUTE_MIN || newMax > equalizerSettings.ABSOLUTE_MAX) {
                alert(
                    `Range must be between ${equalizerSettings.ABSOLUTE_MIN} and ${equalizerSettings.ABSOLUTE_MAX} dB`
                );
                return;
            }

            // Save new range
            equalizerSettings.setRange(newMin, newMax);
            currentRange = { min: newMin, max: newMax };

            // Regenerate bands with new range
            generateEQBands(currentBandCount, newMin, newMax);

            // Update scale display
            updateEQScale(newMin, newMax);

            // Reset gains to flat
            const flatGains = new Array(currentBandCount).fill(0);
            audioContextManager.setAllGains(flatGains);
            updateAllBandUI(flatGains);

            // Reset to flat preset
            if (eqPresetSelect) {
                eqPresetSelect.value = 'flat';
                equalizerSettings.setPreset('flat');
            }

            // Show feedback
            const originalText = applyEqRangeBtn.textContent;
            applyEqRangeBtn.textContent = 'Applied!';
            setTimeout(() => {
                applyEqRangeBtn.textContent = originalText;
            }, 1500);
        });
    }

    // Initialize reset DB range button
    if (resetEqRangeBtn) {
        resetEqRangeBtn.addEventListener('click', () => {
            // Reset to default values
            const defaultMin = equalizerSettings.DEFAULT_RANGE_MIN;
            const defaultMax = equalizerSettings.DEFAULT_RANGE_MAX;

            // Update inputs
            if (eqRangeMinInput) eqRangeMinInput.value = String(defaultMin);
            if (eqRangeMaxInput) eqRangeMaxInput.value = String(defaultMax);

            // Save new range
            equalizerSettings.setRange(defaultMin, defaultMax);
            currentRange = { min: defaultMin, max: defaultMax };

            // Regenerate bands with new range
            generateEQBands(currentBandCount, defaultMin, defaultMax, currentFreqRange.min, currentFreqRange.max);

            // Update scale display
            updateEQScale(defaultMin, defaultMax);

            // Reset gains to flat
            const flatGains = new Array(currentBandCount).fill(0);
            audioContextManager.setAllGains(flatGains);
            updateAllBandUI(flatGains);

            // Reset to flat preset
            if (eqPresetSelect) {
                eqPresetSelect.value = 'flat';
                equalizerSettings.setPreset('flat');
            }

            // Show feedback
            const originalText = resetEqRangeBtn.textContent;
            resetEqRangeBtn.textContent = 'Reset!';
            setTimeout(() => {
                resetEqRangeBtn.textContent = originalText;
            }, 1500);
        });
    }

    // Initialize frequency range inputs
    if (eqFreqMinInput) {
        eqFreqMinInput.value = String(currentFreqRange.min);
    }
    if (eqFreqMaxInput) {
        eqFreqMaxInput.value = String(currentFreqRange.max);
    }

    // Initialize apply frequency range button
    if (applyEqFreqBtn && eqFreqMinInput && eqFreqMaxInput) {
        applyEqFreqBtn.addEventListener('click', () => {
            const newMin = parseInt(eqFreqMinInput.value, 10);
            const newMax = parseInt(eqFreqMaxInput.value, 10);

            // Validate range
            if (isNaN(newMin) || isNaN(newMax)) {
                alert('Please enter valid numbers for the frequency range');
                return;
            }

            if (newMin < equalizerSettings.ABSOLUTE_FREQ_MIN || newMax > equalizerSettings.ABSOLUTE_FREQ_MAX) {
                alert(
                    `Frequency range must be between ${equalizerSettings.ABSOLUTE_FREQ_MIN} Hz and ${equalizerSettings.ABSOLUTE_FREQ_MAX} Hz`
                );
                return;
            }

            if (newMin >= newMax) {
                alert('Minimum frequency must be less than maximum frequency');
                return;
            }

            // Save new frequency range
            equalizerSettings.setFreqRange(newMin, newMax);
            currentFreqRange = { min: newMin, max: newMax };

            // Update audio context
            audioContextManager.setFreqRange(newMin, newMax);

            // Regenerate bands with new frequency range
            generateEQBands(currentBandCount, currentRange.min, currentRange.max, newMin, newMax);

            // Reset gains to flat
            const flatGains = new Array(currentBandCount).fill(0);
            audioContextManager.setAllGains(flatGains);
            updateAllBandUI(flatGains);

            // Reset to flat preset
            if (eqPresetSelect) {
                eqPresetSelect.value = 'flat';
                equalizerSettings.setPreset('flat');
            }

            // Show feedback
            const originalText = applyEqFreqBtn.textContent;
            applyEqFreqBtn.textContent = 'Applied!';
            setTimeout(() => {
                applyEqFreqBtn.textContent = originalText;
            }, 1500);
        });
    }

    // Initialize reset frequency range button
    if (resetEqFreqBtn) {
        resetEqFreqBtn.addEventListener('click', () => {
            // Reset to default values
            const defaultMin = equalizerSettings.DEFAULT_FREQ_MIN;
            const defaultMax = equalizerSettings.DEFAULT_FREQ_MAX;

            // Update inputs
            if (eqFreqMinInput) eqFreqMinInput.value = String(defaultMin);
            if (eqFreqMaxInput) eqFreqMaxInput.value = String(defaultMax);

            // Save new frequency range
            equalizerSettings.setFreqRange(defaultMin, defaultMax);
            currentFreqRange = { min: defaultMin, max: defaultMax };

            // Update audio context
            audioContextManager.setFreqRange(defaultMin, defaultMax);

            // Regenerate bands with new frequency range
            generateEQBands(currentBandCount, currentRange.min, currentRange.max, defaultMin, defaultMax);

            // Reset gains to flat
            const flatGains = new Array(currentBandCount).fill(0);
            audioContextManager.setAllGains(flatGains);
            updateAllBandUI(flatGains);

            // Reset to flat preset
            if (eqPresetSelect) {
                eqPresetSelect.value = 'flat';
                equalizerSettings.setPreset('flat');
            }

            // Show feedback
            const originalText = resetEqFreqBtn.textContent;
            resetEqFreqBtn.textContent = 'Reset!';
            setTimeout(() => {
                resetEqFreqBtn.textContent = originalText;
            }, 1500);
        });
    }

    // Initialize preamp control
    const updatePreampUI = (value: number): void => {
        currentPreamp = value;
        if (eqPreampSlider) eqPreampSlider.value = String(value);
        if (eqPreampInput) eqPreampInput.value = String(value);
        audioContextManager.setPreamp?.(value);
    };

    if (eqPreampSlider) {
        // Set initial value
        eqPreampSlider.value = String(currentPreamp);

        // Handle slider input
        eqPreampSlider.addEventListener('input', (e) => {
            const value = parseFloat((e.target as HTMLInputElement).value);
            updatePreampUI(value);
        });
    }

    if (eqPreampInput) {
        // Set initial value
        eqPreampInput.value = String(currentPreamp);

        // Handle text input
        eqPreampInput.addEventListener('change', (e) => {
            let value = parseFloat((e.target as HTMLInputElement).value);
            // Clamp to valid range
            value = Math.max(-20, Math.min(20, value || 0));
            updatePreampUI(value);
        });

        // Handle enter key
        eqPreampInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
            }
        });
    }

    // Initialize import/export controls
    if (eqExportBtn) {
        eqExportBtn.addEventListener('click', () => {
            const text = audioContextManager.exportEQToText?.();
            if (text) {
                navigator.clipboard
                    .writeText(text)
                    .then(() => {
                        eqExportBtn.textContent = 'Copied!';
                        setTimeout(() => {
                            eqExportBtn.textContent = 'Export';
                        }, 1500);
                    })
                    .catch(() => {
                        // Fallback: create and download file
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'equalizer-settings.txt';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    });
            }
        });
    }

    if (eqImportBtn && eqImportFile) {
        eqImportBtn.addEventListener('click', () => {
            eqImportFile.click();
        });

        eqImportFile.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const success = audioContextManager.importEQFromText?.(text);
                if (success) {
                    // Update UI
                    currentPreamp = equalizerSettings.getPreamp();
                    updatePreampUI(currentPreamp);

                    // Update band count if changed
                    currentBandCount = equalizerSettings.getBandCount();
                    if (eqBandCountInput) eqBandCountInput.value = String(currentBandCount);

                    // Regenerate bands and update UI
                    generateEQBands(
                        currentBandCount,
                        currentRange.min,
                        currentRange.max,
                        currentFreqRange.min,
                        currentFreqRange.max
                    );
                    const gains = audioContextManager.getGains?.() || equalizerSettings.getGains(currentBandCount);
                    updateAllBandUI(gains);

                    eqImportBtn.textContent = 'Imported!';
                    setTimeout(() => {
                        eqImportBtn.textContent = 'Import';
                    }, 1500);
                } else {
                    eqImportBtn.textContent = 'Invalid!';
                    setTimeout(() => {
                        eqImportBtn.textContent = 'Import';
                    }, 1500);
                }
            };
            reader.readAsText(file);

            // Reset file input
            (e.target as HTMLInputElement).value = '';
        });
    }

    // Generate initial EQ bands with current ranges
    generateEQBands(currentBandCount, currentRange.min, currentRange.max, currentFreqRange.min, currentFreqRange.max);

    // Listen for band count changes from other sources
    window.addEventListener('equalizer-band-count-changed', (e: Event) => {
        const detail = (e as CustomEvent<{ bandCount?: number }>).detail;
        if (detail && detail.bandCount) {
            currentBandCount = detail.bandCount;
            if (eqBandCountInput) eqBandCountInput.value = String(currentBandCount);
            generateEQBands(
                currentBandCount,
                currentRange.min,
                currentRange.max,
                currentFreqRange.min,
                currentFreqRange.max
            );
        }
    });

    // Listen for frequency range changes from other sources
    window.addEventListener('equalizer-freq-range-changed', (e: Event) => {
        const detail = (e as CustomEvent<{ min?: number; max?: number }>).detail;
        if (detail && detail.min !== undefined && detail.max !== undefined) {
            currentFreqRange = { min: detail.min, max: detail.max };
            if (eqFreqMinInput) eqFreqMinInput.value = String(currentFreqRange.min);
            if (eqFreqMaxInput) eqFreqMaxInput.value = String(currentFreqRange.max);
            generateEQBands(
                currentBandCount,
                currentRange.min,
                currentRange.max,
                currentFreqRange.min,
                currentFreqRange.max
            );
        }
    });

    // Redraw EQ curve on window resize
    window.addEventListener('resize', () => {
        requestAnimationFrame(drawEQCurve);
    });

    // Redraw EQ curve when a new track loads (audio metadata loaded)
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer) {
        audioPlayer.addEventListener('loadedmetadata', () => {
            // Small delay to ensure the visualizer and EQ are fully ready
            setTimeout(() => {
                drawEQCurve();
            }, 100);
        });
    }

    // Now Playing Mode
    const nowPlayingMode = document.getElementById('now-playing-mode') as HTMLSelectElement | null;
    if (nowPlayingMode) {
        nowPlayingMode.value = nowPlayingSettings.getMode();
        nowPlayingMode.addEventListener('change', (e) => {
            nowPlayingSettings.setMode((e.target as HTMLInputElement).value);
        });
    }

    // Close Modals on Navigation Toggle
    const closeModalsOnNavigationToggle = document.getElementById('close-modals-on-navigation-toggle') as HTMLInputElement | null;
    if (closeModalsOnNavigationToggle) {
        closeModalsOnNavigationToggle.checked = modalSettings.shouldCloseOnNavigation();
        closeModalsOnNavigationToggle.addEventListener('change', (e) => {
            modalSettings.setCloseOnNavigation((e.target as HTMLInputElement).checked);
        });
    }

    // Intercept Back to Close Modals Toggle
    const interceptBackToCloseToggle = document.getElementById('intercept-back-to-close-modals-toggle') as HTMLInputElement | null;
    if (interceptBackToCloseToggle) {
        interceptBackToCloseToggle.checked = modalSettings.shouldInterceptBackToClose();
        interceptBackToCloseToggle.addEventListener('change', (e) => {
            modalSettings.setInterceptBackToClose((e.target as HTMLInputElement).checked);
        });
    }

    // Compact Artist Toggle
    const compactArtistToggle = document.getElementById('compact-artist-toggle') as HTMLInputElement | null;
    if (compactArtistToggle) {
        compactArtistToggle.checked = cardSettings.isCompactArtist();
        compactArtistToggle.addEventListener('change', (e) => {
            cardSettings.setCompactArtist((e.target as HTMLInputElement).checked);
        });
    }

    // Compact Album Toggle
    const compactAlbumToggle = document.getElementById('compact-album-toggle') as HTMLInputElement | null;
    if (compactAlbumToggle) {
        compactAlbumToggle.checked = cardSettings.isCompactAlbum();
        compactAlbumToggle.addEventListener('change', (e) => {
            cardSettings.setCompactAlbum((e.target as HTMLInputElement).checked);
        });
    }

    // Download Lyrics Toggle
    const downloadLyricsToggle = document.getElementById('download-lyrics-toggle') as HTMLInputElement | null;
    if (downloadLyricsToggle) {
        downloadLyricsToggle.checked = lyricsSettings.shouldDownloadLyrics();
        downloadLyricsToggle.addEventListener('change', (e) => {
            lyricsSettings.setDownloadLyrics((e.target as HTMLInputElement).checked);
        });
    }

    // Romaji Lyrics Toggle
    const romajiLyricsToggle = document.getElementById('romaji-lyrics-toggle') as HTMLInputElement | null;
    if (romajiLyricsToggle) {
        romajiLyricsToggle.checked = localStorage.getItem('lyricsRomajiMode') === 'true';
        romajiLyricsToggle.addEventListener('change', (e) => {
            localStorage.setItem('lyricsRomajiMode', (e.target as HTMLInputElement).checked ? 'true' : 'false');
        });
    }

    // Album Background Toggle
    const albumBackgroundToggle = document.getElementById('album-background-toggle') as HTMLInputElement | null;
    if (albumBackgroundToggle) {
        albumBackgroundToggle.checked = backgroundSettings.isEnabled();
        albumBackgroundToggle.addEventListener('change', (e) => {
            backgroundSettings.setEnabled((e.target as HTMLInputElement).checked);
        });
    }

    // Dynamic Color Toggle
    const dynamicColorToggle = document.getElementById('dynamic-color-toggle') as HTMLInputElement | null;
    if (dynamicColorToggle) {
        dynamicColorToggle.checked = dynamicColorSettings.isEnabled();
        dynamicColorToggle.addEventListener('change', (e) => {
            dynamicColorSettings.setEnabled((e.target as HTMLInputElement).checked);
            if (!(e.target as HTMLInputElement).checked) {
                // Reset colors immediately when disabled
                window.dispatchEvent(new CustomEvent('reset-dynamic-color'));
            }
        });
    }

    // Waveform Toggle
    const waveformToggle = document.getElementById('waveform-toggle') as HTMLInputElement | null;
    if (waveformToggle) {
        waveformToggle.checked = waveformSettings.isEnabled();
        waveformToggle.addEventListener('change', (e) => {
            waveformSettings.setEnabled((e.target as HTMLInputElement).checked);

            window.dispatchEvent(new CustomEvent('waveform-toggle', { detail: { enabled: (e.target as HTMLInputElement).checked } }));
        });
    }

    // Smooth Scrolling Toggle
    const smoothScrollingToggle = document.getElementById('smooth-scrolling-toggle') as HTMLInputElement | null;
    if (smoothScrollingToggle) {
        smoothScrollingToggle.checked = smoothScrollingSettings.isEnabled();
        smoothScrollingToggle.addEventListener('change', (e) => {
            smoothScrollingSettings.setEnabled((e.target as HTMLInputElement).checked);

            window.dispatchEvent(new CustomEvent('smooth-scrolling-toggle', { detail: { enabled: (e.target as HTMLInputElement).checked } }));
        });
    }

    // Visualizer Sensitivity
    const visualizerSensitivitySlider = document.getElementById('visualizer-sensitivity-slider') as HTMLInputElement | null;
    const visualizerSensitivityValue = document.getElementById('visualizer-sensitivity-value');
    if (visualizerSensitivitySlider && visualizerSensitivityValue) {
        const currentSensitivity = visualizerSettings.getSensitivity();
        visualizerSensitivitySlider.value = String(currentSensitivity);
        visualizerSensitivityValue.textContent = `${(currentSensitivity * 100).toFixed(0)}%`;

        visualizerSensitivitySlider.addEventListener('input', (e) => {
            const newSensitivity = parseFloat((e.target as HTMLInputElement).value);
            visualizerSettings.setSensitivity(newSensitivity);
            visualizerSensitivityValue.textContent = `${(newSensitivity * 100).toFixed(0)}%`;
        });
    }

    // Visualizer Smart Intensity
    const smartIntensityToggle = document.getElementById('smart-intensity-toggle') as HTMLInputElement | null;
    if (smartIntensityToggle) {
        const isSmart = visualizerSettings.isSmartIntensityEnabled();
        smartIntensityToggle.checked = isSmart;

        const updateSliderState = (enabled: boolean): void => {
            if (visualizerSensitivitySlider) {
                visualizerSensitivitySlider.disabled = enabled;
                visualizerSensitivitySlider.parentElement!.style.opacity = enabled ? '0.5' : '1';
                visualizerSensitivitySlider.parentElement!.style.pointerEvents = enabled ? 'none' : 'auto';
            }
        };
        updateSliderState(isSmart);

        smartIntensityToggle.addEventListener('change', (e) => {
            visualizerSettings.setSmartIntensity((e.target as HTMLInputElement).checked);
            updateSliderState((e.target as HTMLInputElement).checked);
        });
    }

    // Visualizer Enabled Toggle
    const visualizerEnabledToggle = document.getElementById('visualizer-enabled-toggle') as HTMLInputElement | null;
    const visualizerModeSetting = document.getElementById('visualizer-mode-setting');
    const visualizerSmartIntensitySetting = document.getElementById('visualizer-smart-intensity-setting');
    const visualizerSensitivitySetting = document.getElementById('visualizer-sensitivity-setting');
    const visualizerPresetSetting = document.getElementById('visualizer-preset-setting');
    const visualizerPresetSelect = document.getElementById('visualizer-preset-select') as HTMLSelectElement | null;

    // Butterchurn Settings Elements
    const butterchurnCycleSetting = document.getElementById('butterchurn-cycle-setting');
    const butterchurnDurationSetting = document.getElementById('butterchurn-duration-setting');
    const butterchurnRandomizeSetting = document.getElementById('butterchurn-randomize-setting');
    const butterchurnSpecificPresetSetting = document.getElementById('butterchurn-specific-preset-setting');
    const butterchurnSpecificPresetSelect = document.getElementById('butterchurn-specific-preset-select') as HTMLSelectElement | null;
    const butterchurnCycleToggle = document.getElementById('butterchurn-cycle-toggle') as HTMLInputElement | null;
    const butterchurnDurationInput = document.getElementById('butterchurn-duration-input') as HTMLInputElement | null;
    const butterchurnRandomizeToggle = document.getElementById('butterchurn-randomize-toggle') as HTMLInputElement | null;

    const updateButterchurnSettingsVisibility = (): void => {
        const isEnabled = visualizerEnabledToggle ? visualizerEnabledToggle.checked : false;
        const isButterchurn = visualizerPresetSelect ? visualizerPresetSelect.value === 'butterchurn' : false;
        const show = isEnabled && isButterchurn;

        if (butterchurnCycleSetting) butterchurnCycleSetting.style.display = show ? 'flex' : 'none';
        if (butterchurnSpecificPresetSetting) butterchurnSpecificPresetSetting.style.display = show ? 'flex' : 'none';

        // Cycle duration and randomize only show if cycle is enabled
        const isCycleEnabled = butterchurnCycleToggle ? butterchurnCycleToggle.checked : false;
        const showSubSettings = show && isCycleEnabled;

        if (butterchurnDurationSetting) butterchurnDurationSetting.style.display = showSubSettings ? 'flex' : 'none';
        if (butterchurnRandomizeSetting) butterchurnRandomizeSetting.style.display = showSubSettings ? 'flex' : 'none';

        // Populate preset list using module-level cache (works even before visualizer initializes)
        const { keys: presetNames } = getButterchurnPresets();
        const select = butterchurnSpecificPresetSelect;

        if (select && presetNames.length > 0) {
            const currentNames = Array.from((select as HTMLSelectElement).options).map((opt: HTMLOptionElement) => opt.value);
            // Check if dropdown only has "Loading..." or needs full update
            const hasOnlyLoadingOption = currentNames.length === 1 && currentNames[0] === '';
            const needsUpdate =
                hasOnlyLoadingOption ||
                currentNames.length !== presetNames.length ||
                !presetNames.every((name) => currentNames.includes(name));

            if (needsUpdate) {
                // Save current selection
                const currentSelection = select.value;

                // Clear and rebuild dropdown
                select.innerHTML = '';
                presetNames.forEach((name) => {
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = name;
                    select.appendChild(option);
                });

                // Restore selection if it still exists
                if (presetNames.includes(currentSelection)) {
                    select.value = currentSelection;
                } else {
                    select.selectedIndex = 0;
                }
            }
        }
    };

    const updateVisualizerSettingsVisibility = (enabled: boolean): void => {
        const display = enabled ? 'flex' : 'none';
        if (visualizerModeSetting) visualizerModeSetting.style.display = display;
        if (visualizerSmartIntensitySetting) visualizerSmartIntensitySetting.style.display = display;
        if (visualizerSensitivitySetting) visualizerSensitivitySetting.style.display = display;
        if (visualizerPresetSetting) visualizerPresetSetting.style.display = display;

        // Also update Butterchurn specific visibility
        updateButterchurnSettingsVisibility();
    };

    // Initialize preset select value early so visibility logic works correctly on load
    if (visualizerPresetSelect) {
        visualizerPresetSelect.value = visualizerSettings.getPreset();
    }

    if (visualizerEnabledToggle) {
        visualizerEnabledToggle.checked = visualizerSettings.isEnabled();

        updateVisualizerSettingsVisibility(visualizerEnabledToggle.checked);

        visualizerEnabledToggle.addEventListener('change', (e) => {
            visualizerSettings.setEnabled((e.target as HTMLInputElement).checked);
            updateVisualizerSettingsVisibility((e.target as HTMLInputElement).checked);
        });
    }

    // Visualizer Preset Select
    if (visualizerPresetSelect) {
        // value set above
        visualizerPresetSelect.addEventListener('change', (e) => {
            const val = (e.target as HTMLInputElement).value;
            visualizerSettings.setPreset(val);
            if (ui && ui.visualizer) {
                ui.visualizer.setPreset(val);
            }
            updateButterchurnSettingsVisibility();
        });
    }

    if (butterchurnCycleToggle) {
        butterchurnCycleToggle.checked = visualizerSettings.isButterchurnCycleEnabled();
        butterchurnCycleToggle.addEventListener('change', (e) => {
            visualizerSettings.setButterchurnCycleEnabled((e.target as HTMLInputElement).checked);
            updateButterchurnSettingsVisibility();
        });
    }

    if (butterchurnDurationInput) {
        butterchurnDurationInput.value = String(visualizerSettings.getButterchurnCycleDuration());
        butterchurnDurationInput.addEventListener('change', (e) => {
            let val = parseInt((e.target as HTMLInputElement).value, 10);
            if (isNaN(val) || val < 5) val = 5;
            if (val > 300) val = 300;
            (e.target as HTMLInputElement).value = String(val);
            visualizerSettings.setButterchurnCycleDuration(val);
        });
    }

    if (butterchurnRandomizeToggle) {
        butterchurnRandomizeToggle.checked = visualizerSettings.isButterchurnRandomizeEnabled();
        butterchurnRandomizeToggle.addEventListener('change', (e) => {
            visualizerSettings.setButterchurnRandomizeEnabled((e.target as HTMLInputElement).checked);
        });
    }

    if (butterchurnSpecificPresetSelect) {
        butterchurnSpecificPresetSelect.addEventListener('change', (e) => {
            // Try to load via visualizer if active, otherwise just store the selection
            if (ui && ui.visualizer && ui.visualizer.presets['butterchurn']) {
                ui.visualizer.presets['butterchurn'].loadPreset((e.target as HTMLInputElement).value);
            }
        });
    }

    // Refresh settings when presets are loaded asynchronously
    window.addEventListener('butterchurn-presets-loaded', () => {
        console.log('[Settings] Butterchurn presets loaded event received');
        updateButterchurnSettingsVisibility();
    });

    // Check if presets already cached and update immediately
    const { keys: cachedKeys } = getButterchurnPresets();
    if (cachedKeys.length > 0) {
        console.log('[Settings] Presets already cached, updating dropdown immediately');
        updateButterchurnSettingsVisibility();
    }

    // Watch for audio tab becoming active and refresh presets
    const audioTabContent = document.getElementById('settings-tab-audio');
    if (audioTabContent) {
        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (audioTabContent.classList.contains('active')) {
                        console.log('[Settings] Audio tab became active, refreshing presets');
                        updateButterchurnSettingsVisibility();
                    }
                }
            });
        });
        observer.observe(audioTabContent, { attributes: true });
    }

    // Visualizer Mode Select
    const visualizerModeSelect = document.getElementById('visualizer-mode-select') as HTMLSelectElement | null;
    if (visualizerModeSelect) {
        visualizerModeSelect.value = visualizerSettings.getMode();
        visualizerModeSelect.addEventListener('change', (e) => {
            visualizerSettings.setMode((e.target as HTMLInputElement).value);
        });
    }

    // Home Page Section Toggles
    const showRecommendedSongsToggle = document.getElementById('show-recommended-songs-toggle') as HTMLInputElement | null;
    if (showRecommendedSongsToggle) {
        showRecommendedSongsToggle.checked = homePageSettings.shouldShowRecommendedSongs();
        showRecommendedSongsToggle.addEventListener('change', (e) => {
            homePageSettings.setShowRecommendedSongs((e.target as HTMLInputElement).checked);
        });
    }

    const showRecommendedAlbumsToggle = document.getElementById('show-recommended-albums-toggle') as HTMLInputElement | null;
    if (showRecommendedAlbumsToggle) {
        showRecommendedAlbumsToggle.checked = homePageSettings.shouldShowRecommendedAlbums();
        showRecommendedAlbumsToggle.addEventListener('change', (e) => {
            homePageSettings.setShowRecommendedAlbums((e.target as HTMLInputElement).checked);
        });
    }

    const showRecommendedArtistsToggle = document.getElementById('show-recommended-artists-toggle') as HTMLInputElement | null;
    if (showRecommendedArtistsToggle) {
        showRecommendedArtistsToggle.checked = homePageSettings.shouldShowRecommendedArtists();
        showRecommendedArtistsToggle.addEventListener('change', (e) => {
            homePageSettings.setShowRecommendedArtists((e.target as HTMLInputElement).checked);
        });
    }

    const showJumpBackInToggle = document.getElementById('show-jump-back-in-toggle') as HTMLInputElement | null;
    if (showJumpBackInToggle) {
        showJumpBackInToggle.checked = homePageSettings.shouldShowJumpBackIn();
        showJumpBackInToggle.addEventListener('change', (e) => {
            homePageSettings.setShowJumpBackIn((e.target as HTMLInputElement).checked);
        });
    }

    const showEditorsPicksToggle = document.getElementById('show-editors-picks-toggle') as HTMLInputElement | null;
    if (showEditorsPicksToggle) {
        showEditorsPicksToggle.checked = homePageSettings.shouldShowEditorsPicks();
        showEditorsPicksToggle.addEventListener('change', (e) => {
            homePageSettings.setShowEditorsPicks((e.target as HTMLInputElement).checked);
        });
    }

    const shuffleEditorsPicksToggle = document.getElementById('shuffle-editors-picks-toggle') as HTMLInputElement | null;
    if (shuffleEditorsPicksToggle) {
        shuffleEditorsPicksToggle.checked = homePageSettings.shouldShuffleEditorsPicks();
        shuffleEditorsPicksToggle.addEventListener('change', (e) => {
            homePageSettings.setShuffleEditorsPicks((e.target as HTMLInputElement).checked);
        });
    }

    // Sidebar Section Toggles
    const sidebarShowHomeToggle = document.getElementById('sidebar-show-home-toggle') as HTMLInputElement | null;
    if (sidebarShowHomeToggle) {
        sidebarShowHomeToggle.checked = sidebarSectionSettings.shouldShowHome();
        sidebarShowHomeToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowHome((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowLibraryToggle = document.getElementById('sidebar-show-library-toggle') as HTMLInputElement | null;
    if (sidebarShowLibraryToggle) {
        sidebarShowLibraryToggle.checked = sidebarSectionSettings.shouldShowLibrary();
        sidebarShowLibraryToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowLibrary((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowRecentToggle = document.getElementById('sidebar-show-recent-toggle') as HTMLInputElement | null;
    if (sidebarShowRecentToggle) {
        sidebarShowRecentToggle.checked = sidebarSectionSettings.shouldShowRecent();
        sidebarShowRecentToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowRecent((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowUnreleasedToggle = document.getElementById('sidebar-show-unreleased-toggle') as HTMLInputElement | null;
    if (sidebarShowUnreleasedToggle) {
        sidebarShowUnreleasedToggle.checked = sidebarSectionSettings.shouldShowUnreleased();
        sidebarShowUnreleasedToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowUnreleased((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowDonateToggle = document.getElementById('sidebar-show-donate-toggle') as HTMLInputElement | null;
    if (sidebarShowDonateToggle) {
        sidebarShowDonateToggle.checked = sidebarSectionSettings.shouldShowDonate();
        sidebarShowDonateToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowDonate((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowSettingsToggle = document.getElementById('sidebar-show-settings-toggle') as HTMLInputElement | null;
    if (sidebarShowSettingsToggle) {
        sidebarShowSettingsToggle.checked = true;
        sidebarShowSettingsToggle.disabled = true;
        sidebarSectionSettings.setShowSettings(true);
    }

    const sidebarShowAboutToggle = document.getElementById('sidebar-show-about-bottom-toggle') as HTMLInputElement | null;
    if (sidebarShowAboutToggle) {
        sidebarShowAboutToggle.checked = sidebarSectionSettings.shouldShowAbout();
        sidebarShowAboutToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowAbout((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowDownloadToggle = document.getElementById('sidebar-show-download-bottom-toggle') as HTMLInputElement | null;
    if (sidebarShowDownloadToggle) {
        sidebarShowDownloadToggle.checked = sidebarSectionSettings.shouldShowDownload();
        sidebarShowDownloadToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowDownload((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    const sidebarShowDiscordToggle = document.getElementById('sidebar-show-discordbtn-toggle') as HTMLInputElement | null;
    if (sidebarShowDiscordToggle) {
        sidebarShowDiscordToggle.checked = sidebarSectionSettings.shouldShowDiscord();
        sidebarShowDiscordToggle.addEventListener('change', (e) => {
            sidebarSectionSettings.setShowDiscord((e.target as HTMLInputElement).checked);
            sidebarSectionSettings.applySidebarVisibility();
        });
    }

    // Apply sidebar visibility on initialization
    sidebarSectionSettings.applySidebarVisibility();

    const sidebarSettingsGroup = sidebarShowHomeToggle?.closest('.settings-group');
    if (sidebarSettingsGroup) {
        const toggleIdFromSidebarId = (sidebarId: string): string =>
            sidebarId ? sidebarId.replace('sidebar-nav-', 'sidebar-show-') + '-toggle' : '';

        const sidebarOrderConfig = sidebarSectionSettings.DEFAULT_ORDER.map((sidebarId) => ({
            sidebarId,
            toggleId: toggleIdFromSidebarId(sidebarId),
        }));

        sidebarOrderConfig.forEach(({ toggleId, sidebarId }) => {
            const toggle = document.getElementById(toggleId);
            const item = toggle?.closest('.setting-item') as HTMLElement | null;
            if (!item) return;
            item.dataset.sidebarId = sidebarId;
            item.classList.add('sidebar-setting-item');
            item.draggable = true;
        });

        const mainContainer = sidebarSettingsGroup.querySelector('.sidebar-settings-main') as HTMLElement | null;
        const bottomContainer = sidebarSettingsGroup.querySelector('.sidebar-settings-bottom') as HTMLElement | null;

        const getSidebarItems = (): HTMLElement[] => [
            ...Array.from(mainContainer?.querySelectorAll('.sidebar-setting-item[data-sidebar-id]') ?? []) as HTMLElement[],
            ...Array.from(bottomContainer?.querySelectorAll('.sidebar-setting-item[data-sidebar-id]') ?? []) as HTMLElement[],
        ];

        const applySidebarSettingsOrder = (): void => {
            const order = sidebarSectionSettings.getOrder();
            const bottomIds = sidebarSectionSettings.getBottomNavIds();
            const mainOrder = order.filter((id) => !bottomIds.includes(id));
            const bottomOrder = order.filter((id) => bottomIds.includes(id));
            const allItems = getSidebarItems();
            const itemMap = new Map(allItems.map((item) => [(item as HTMLElement).dataset.sidebarId, item]));

            mainOrder.forEach((id) => {
                const item = itemMap.get(id);
                if (item && mainContainer) mainContainer.appendChild(item);
            });
            bottomOrder.forEach((id) => {
                const item = itemMap.get(id);
                if (item && bottomContainer) bottomContainer.appendChild(item);
            });
        };

        applySidebarSettingsOrder();

        let draggedItem: HTMLElement | null = null;

        const saveSidebarOrder = (): void => {
            const order = getSidebarItems().map((item) => item.dataset.sidebarId).filter((id): id is string => !!id);
            sidebarSectionSettings.setOrder(order);
            sidebarSectionSettings.applySidebarVisibility();
        };

        const handleDragStart = (e: DragEvent): void => {
            const item = (e.target as HTMLElement)?.closest('.sidebar-setting-item') as HTMLElement | null;
            if (!item) return;
            draggedItem = item;
            draggedItem.classList.add('dragging');
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', (item as HTMLElement).dataset.sidebarId || '');
            }
        };

        const handleDragEnd = (): void => {
            if (!draggedItem) return;
            draggedItem.classList.remove('dragging');
            draggedItem = null;
            saveSidebarOrder();
        };

        const getDragAfterElement = (elements: HTMLElement[], y: number): HTMLElement | undefined => {
            const draggableElements = elements.filter((el) => el !== draggedItem);
            return draggableElements.reduce<{ offset: number; element?: HTMLElement }>(
                (closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    if (offset < 0 && offset > closest.offset) {
                        return { offset, element: child };
                    }
                    return closest;
                },
                { offset: Number.NEGATIVE_INFINITY }
            ).element;
        };

        const handleDragOver = (e: DragEvent): void => {
            e.preventDefault();
            if (!draggedItem) return;
            const container = draggedItem.parentElement;
            if (!container) return;
            if (container !== mainContainer && container !== bottomContainer) return;
            const sectionItems = Array.from(container.querySelectorAll('.sidebar-setting-item[data-sidebar-id]')) as HTMLElement[];
            const afterElement = getDragAfterElement(sectionItems, e.clientY);
            if (afterElement === (draggedItem as HTMLElement | null)) return;
            if (afterElement) {
                container.insertBefore(draggedItem, afterElement);
            } else {
                container.appendChild(draggedItem);
            }
        };

        sidebarSettingsGroup.addEventListener('dragstart', handleDragStart as EventListener);
        sidebarSettingsGroup.addEventListener('dragend', handleDragEnd as EventListener);
        sidebarSettingsGroup.addEventListener('dragover', handleDragOver as EventListener);
        sidebarSettingsGroup.addEventListener('drop', (e: Event) => e.preventDefault());
    }

    // Filename template setting
    const filenameTemplate = document.getElementById('filename-template') as HTMLInputElement | null;
    if (filenameTemplate) {
        filenameTemplate.value = localStorage.getItem('filename-template') || '{trackNumber} - {artist} - {title}';
        filenameTemplate.addEventListener('change', (e) => {
            localStorage.setItem('filename-template', (e.target as HTMLInputElement).value);
        });
    }

    // ZIP folder template
    const zipFolderTemplate = document.getElementById('zip-folder-template') as HTMLInputElement | null;
    if (zipFolderTemplate) {
        zipFolderTemplate.value = localStorage.getItem('zip-folder-template') || '{albumTitle} - {albumArtist}';
        zipFolderTemplate.addEventListener('change', (e) => {
            localStorage.setItem('zip-folder-template', (e.target as HTMLInputElement).value);
        });
    }

    // Playlist file generation settings
    const generateM3UToggle = document.getElementById('generate-m3u-toggle') as HTMLInputElement | null;
    if (generateM3UToggle) {
        generateM3UToggle.checked = playlistSettings.shouldGenerateM3U();
        generateM3UToggle.addEventListener('change', (e) => {
            playlistSettings.setGenerateM3U((e.target as HTMLInputElement).checked);
        });
    }

    const generateM3U8Toggle = document.getElementById('generate-m3u8-toggle') as HTMLInputElement | null;
    if (generateM3U8Toggle) {
        generateM3U8Toggle.checked = playlistSettings.shouldGenerateM3U8();
        generateM3U8Toggle.addEventListener('change', (e) => {
            playlistSettings.setGenerateM3U8((e.target as HTMLInputElement).checked);
        });
    }

    const generateCUEtoggle = document.getElementById('generate-cue-toggle') as HTMLInputElement | null;
    if (generateCUEtoggle) {
        generateCUEtoggle.checked = playlistSettings.shouldGenerateCUE();
        generateCUEtoggle.addEventListener('change', (e) => {
            playlistSettings.setGenerateCUE((e.target as HTMLInputElement).checked);
        });
    }

    const generateNFOtoggle = document.getElementById('generate-nfo-toggle') as HTMLInputElement | null;
    if (generateNFOtoggle) {
        generateNFOtoggle.checked = playlistSettings.shouldGenerateNFO();
        generateNFOtoggle.addEventListener('change', (e) => {
            playlistSettings.setGenerateNFO((e.target as HTMLInputElement).checked);
        });
    }

    const generateJSONtoggle = document.getElementById('generate-json-toggle') as HTMLInputElement | null;
    if (generateJSONtoggle) {
        generateJSONtoggle.checked = playlistSettings.shouldGenerateJSON();
        generateJSONtoggle.addEventListener('change', (e) => {
            playlistSettings.setGenerateJSON((e.target as HTMLInputElement).checked);
        });
    }

    const relativePathsToggle = document.getElementById('relative-paths-toggle') as HTMLInputElement | null;
    if (relativePathsToggle) {
        relativePathsToggle.checked = playlistSettings.shouldUseRelativePaths();
        relativePathsToggle.addEventListener('change', (e) => {
            playlistSettings.setUseRelativePaths((e.target as HTMLInputElement).checked);
        });
    }

    const separateDiscsZipToggle = document.getElementById('separate-discs-zip-toggle') as HTMLInputElement | null;
    if (separateDiscsZipToggle) {
        separateDiscsZipToggle.checked = playlistSettings.shouldSeparateDiscsInZip();
        separateDiscsZipToggle.addEventListener('change', (e) => {
            playlistSettings.setSeparateDiscsInZip((e.target as HTMLInputElement).checked);
        });
    }

    // API settings
    document.getElementById('refresh-speed-test-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('refresh-speed-test-btn') as HTMLButtonElement | null;
        if (!btn) return;
        const originalText = btn.textContent;
        btn.textContent = 'Testing...';
        btn.disabled = true;

        try {
            await api.settings.refreshInstances();
            ui.renderApiSettings();
            btn.textContent = 'Done!';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1500);
        } catch (error) {
            console.error('Failed to refresh speed tests:', error);
            btn.textContent = 'Error';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1500);
        }
    });

    document.getElementById('api-instance-list')?.addEventListener('click', async (e) => {
        const button = (e.target as HTMLElement).closest('button');
        if (!button) return;

        const li = button?.closest('li') as HTMLElement | null;
        const index = parseInt(li?.dataset.index ?? '0', 10);
        const type = li?.dataset.type || 'api'; // Default to api if not present

        const instances = await api.settings.getInstances(type);

        if (button.classList.contains('move-up') && index > 0) {
            [instances[index], instances[index - 1]] = [instances[index - 1], instances[index]];
        } else if (button.classList.contains('move-down') && index < instances.length - 1) {
            [instances[index], instances[index + 1]] = [instances[index + 1], instances[index]];
        }

        api.settings.saveInstances(instances, type);
        ui.renderApiSettings();
    });

    document.getElementById('clear-cache-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('clear-cache-btn') as HTMLButtonElement | null;
        if (!btn) return;
        const originalText = btn.textContent;
        btn.textContent = 'Clearing...';
        btn.disabled = true;

        try {
            await api.clearCache();
            btn.textContent = 'Cleared!';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
                if (window.location.hash.includes('settings')) {
                    ui.renderApiSettings();
                }
            }, 1500);
        } catch (error) {
            console.error('Failed to clear cache:', error);
            btn.textContent = 'Error';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1500);
        }
    });

    document.getElementById('firebase-clear-cloud-btn')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete ALL your data from the cloud? This cannot be undone.')) {
            try {
                await syncManager.clearCloudData();
                alert('Cloud data cleared successfully.');
                authManager.signOut();
            } catch (error) {
                console.error('Failed to clear cloud data:', error);
                alert('Failed to clear cloud data: ' + (error instanceof Error ? error.message : String(error)));
            }
        }
    });

    // Backup & Restore
    document.getElementById('export-library-btn')?.addEventListener('click', async () => {
        const data = await db.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `monochrome-library-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    const importInput = document.getElementById('import-library-input') as HTMLInputElement | null;
    document.getElementById('import-library-btn')?.addEventListener('click', () => {
        importInput?.click();
    });

    importInput?.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                await db.importData(data);
                alert('Library imported successfully!');
                window.location.reload(); // Simple way to refresh all state
            } catch (err) {
                console.error('Import failed:', err);
                alert('Failed to import library. Please check the file format.');
            }
        };
        reader.readAsText(file);
    });

    const customDbBtn = document.getElementById('custom-db-btn') as HTMLButtonElement | null;
    const customDbModal = document.getElementById('custom-db-modal');
    const customPbUrlInput = document.getElementById('custom-pb-url') as HTMLInputElement | null;
    const customFirebaseConfigInput = document.getElementById('custom-firebase-config') as HTMLTextAreaElement | null;
    const customDbSaveBtn = document.getElementById('custom-db-save') as HTMLButtonElement | null;
    const customDbResetBtn = document.getElementById('custom-db-reset') as HTMLButtonElement | null;
    const customDbCancelBtn = document.getElementById('custom-db-cancel') as HTMLButtonElement | null;

    if (customDbBtn && customDbModal) {
        const fbFromEnv = !!window.__FIREBASE_CONFIG__;
        const pbFromEnv = !!window.__POCKETBASE_URL__;

        // Hide entire setting if both are server-configured
        if (fbFromEnv && pbFromEnv) {
            const settingItem = customDbBtn.closest('.setting-item') as HTMLElement | null;
            if (settingItem) settingItem.style.display = 'none';
        }

        // Hide individual fields in the modal
        if (pbFromEnv && customPbUrlInput) (customPbUrlInput.closest('div[style]') as HTMLElement)!.style.display = 'none';
        if (fbFromEnv && customFirebaseConfigInput)
            (customFirebaseConfigInput.closest('div[style]') as HTMLElement)!.style.display = 'none';

        customDbBtn.addEventListener('click', () => {
            const pbUrl = localStorage.getItem('monochrome-pocketbase-url') || '';
            const fbConfig = localStorage.getItem('monochrome-firebase-config');

            if (!pbFromEnv && customPbUrlInput) customPbUrlInput.value = pbUrl;
            if (!fbFromEnv && customFirebaseConfigInput) {
                if (fbConfig) {
                    try {
                        customFirebaseConfigInput.value = JSON.stringify(JSON.parse(fbConfig), null, 2);
                    } catch {
                        customFirebaseConfigInput.value = fbConfig;
                    }
                } else {
                    customFirebaseConfigInput.value = '';
                }
            }

            customDbModal.classList.add('active');
        });

        const closeCustomDbModal = (): void => {
            customDbModal.classList.remove('active');
        };

        customDbCancelBtn?.addEventListener('click', closeCustomDbModal);
        customDbModal.querySelector('.modal-overlay')!.addEventListener('click', closeCustomDbModal);

        customDbSaveBtn?.addEventListener('click', () => {
            const pbUrl = customPbUrlInput?.value.trim() ?? '';
            const fbConfigStr = customFirebaseConfigInput?.value.trim() ?? '';

            if (pbUrl) {
                localStorage.setItem('monochrome-pocketbase-url', pbUrl);
            } else {
                localStorage.removeItem('monochrome-pocketbase-url');
            }

            if (fbConfigStr) {
                try {
                    const fbConfig = JSON.parse(fbConfigStr);
                    saveFirebaseConfig(fbConfig);
                } catch {
                    alert('Invalid JSON for Firebase Config');
                    return;
                }
            } else {
                clearFirebaseConfig();
            }

            alert('Settings saved. Reloading...');
            window.location.reload();
        });

        customDbResetBtn?.addEventListener('click', () => {
            if (confirm('Reset custom database settings to default?')) {
                localStorage.removeItem('monochrome-pocketbase-url');
                clearFirebaseConfig();
                alert('Settings reset. Reloading...');
                window.location.reload();
            }
        });
    }

    // PWA Auto-Update Toggle
    const pwaAutoUpdateToggle = document.getElementById('pwa-auto-update-toggle') as HTMLInputElement | null;
    if (pwaAutoUpdateToggle) {
        pwaAutoUpdateToggle.checked = pwaUpdateSettings.isAutoUpdateEnabled();
        pwaAutoUpdateToggle.addEventListener('change', (e) => {
            pwaUpdateSettings.setAutoUpdateEnabled((e.target as HTMLInputElement).checked);
        });
    }

    // Analytics Toggle
    const analyticsToggle = document.getElementById('analytics-toggle') as HTMLInputElement | null;
    if (analyticsToggle) {
        analyticsToggle.checked = analyticsSettings.isEnabled();
        analyticsToggle.addEventListener('change', (e) => {
            analyticsSettings.setEnabled((e.target as HTMLInputElement).checked);
        });
    }

    // Reset Local Data Button
    const resetLocalDataBtn = document.getElementById('reset-local-data-btn') as HTMLButtonElement | null;
    if (resetLocalDataBtn) {
        resetLocalDataBtn.addEventListener('click', async () => {
            if (
                confirm(
                    'WARNING: This will clear all local data including settings, cache, and library.\n\nAre you sure you want to continue?\n\n(Cloud-synced data will not be affected)'
                )
            ) {
                try {
                    // Clear all localStorage
                    const keysToPreserve: string[] = [];
                    // Optionally preserve certain keys if needed

                    // Get all keys
                    const allKeys = Object.keys(localStorage);

                    // Clear each key except preserved ones
                    allKeys.forEach((key) => {
                        if (!keysToPreserve.includes(key)) {
                            localStorage.removeItem(key);
                        }
                    });

                    // Clear IndexedDB - try to clear individual stores, fallback to deleting database
                    try {
                        const stores = ['tracks', 'albums', 'artists', 'playlists', 'settings', 'history'];
                        for (const storeName of stores) {
                            try {
                                await db.performTransaction(storeName, 'readwrite', (store: IDBObjectStore) => store.clear());
                            } catch {
                                // Store might not exist, continue
                            }
                        }
                    } catch (dbError) {
                        console.log('Could not clear IndexedDB stores:', dbError);
                        // Try to delete the entire database as fallback
                        try {
                            const deleteRequest = indexedDB.deleteDatabase('monochromeDB');
                            await new Promise((resolve, reject) => {
                                deleteRequest.onsuccess = resolve;
                                deleteRequest.onerror = reject;
                            });
                        } catch (deleteError) {
                            console.log('Could not delete IndexedDB:', deleteError);
                        }
                    }

                    alert('All local data has been cleared. The app will now reload.');
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to reset local data:', error);
                    alert('Failed to reset local data: ' + (error instanceof Error ? error.message : String(error)));
                }
            }
        });
    }

    // Font Settings
    initializeFontSettings();

    // Settings Search functionality
    setupSettingsSearch();

    // Blocked Content Management
    initializeBlockedContentManager();
}

function initializeFontSettings(): void {
    const fontTypeSelect = document.getElementById('font-type-select') as HTMLSelectElement | null;
    const fontPresetSection = document.getElementById('font-preset-section');
    const fontGoogleSection = document.getElementById('font-google-section');
    const fontUrlSection = document.getElementById('font-url-section');
    const fontUploadSection = document.getElementById('font-upload-section');
    const fontPresetSelect = document.getElementById('font-preset-select') as HTMLSelectElement | null;
    const fontGoogleInput = document.getElementById('font-google-input') as HTMLInputElement | null;
    const fontGoogleApply = document.getElementById('font-google-apply') as HTMLButtonElement | null;
    const fontUrlInput = document.getElementById('font-url-input') as HTMLInputElement | null;
    const fontUrlName = document.getElementById('font-url-name') as HTMLInputElement | null;
    const fontUrlApply = document.getElementById('font-url-apply') as HTMLButtonElement | null;
    const fontUploadInput = document.getElementById('font-upload-input') as HTMLInputElement | null;
    const uploadedFontsList = document.getElementById('uploaded-fonts-list');

    if (!fontTypeSelect) return;

    // Load current font config
    const config = fontSettings.getConfig();

    // Show correct section based on type
    function showFontSection(type: string): void {
        if (fontPresetSection) fontPresetSection.style.display = type === 'preset' ? 'block' : 'none';
        if (fontGoogleSection) fontGoogleSection.style.display = type === 'google' ? 'flex' : 'none';
        if (fontUrlSection) fontUrlSection.style.display = type === 'url' ? 'flex' : 'none';
        if (fontUploadSection) fontUploadSection.style.display = type === 'upload' ? 'block' : 'none';
    }

    // Initialize UI state
    fontTypeSelect.value = config.type;
    showFontSection(config.type);

    if (config.type === 'preset') {
        if (fontPresetSelect) fontPresetSelect.value = config.family;
    } else if (config.type === 'google') {
        if (fontGoogleInput) fontGoogleInput.value = config.family || '';
    } else if (config.type === 'url') {
        if (fontUrlInput) fontUrlInput.value = config.url || '';
        if (fontUrlName) fontUrlName.value = config.family || '';
    }

    // Type selector change
    fontTypeSelect.addEventListener('change', (e) => {
        showFontSection((e.target as HTMLInputElement).value);
    });

    // Preset font change
    fontPresetSelect?.addEventListener('change', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (value === 'System UI') {
            fontSettings.loadPresetFont(
                "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue'",
                'sans-serif'
            );
        } else if (value === 'monospace') {
            fontSettings.loadPresetFont('monospace', 'monospace');
        } else if (value === 'Apple Music') {
            fontSettings.loadAppleMusicFont();
        } else {
            fontSettings.loadPresetFont(value, 'sans-serif');
        }
    });

    // Google Fonts apply
    fontGoogleApply?.addEventListener('click', () => {
        const input = fontGoogleInput?.value.trim() ?? '';
        if (!input) return;

        let fontName = input;

        // Check if it's a Google Fonts URL
        try {
            const urlObj = new URL(input);
            if (urlObj.hostname === 'fonts.google.com') {
                const parsed = fontSettings.parseGoogleFontsUrl(input);
                if (parsed) {
                    fontName = parsed;
                }
            }
        } catch {
            // Not a URL, treat as font name
        }

        fontSettings.loadGoogleFont(fontName);
    });

    // URL font apply
    fontUrlApply?.addEventListener('click', () => {
        const url = fontUrlInput?.value.trim() ?? '';
        const name = fontUrlName?.value.trim() ?? '';
        if (!url) return;

        fontSettings.loadFontFromUrl(url, name || 'CustomFont');
    });

    // File upload
    fontUploadInput?.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            const font = await fontSettings.saveUploadedFont(file) as { id: string };
            await fontSettings.loadUploadedFont(font.id);
            renderUploadedFontsList();
            if (fontUploadInput) fontUploadInput.value = '';
        } catch (err) {
            console.error('Failed to upload font:', err);
            alert('Failed to upload font');
        }
    });

    // Render uploaded fonts list
    function renderUploadedFontsList(): void {
        const fonts = fontSettings.getUploadedFontList();
        if (!uploadedFontsList) return;
        uploadedFontsList.innerHTML = '';

        fonts.forEach((font) => {
            const item = document.createElement('div');
            item.className = 'uploaded-font-item';
            item.innerHTML = `
                <span class="font-name">${font.name}</span>
                <div class="font-actions">
                    <button class="btn-icon" data-id="${font.id}" data-action="use">Use</button>
                    <button class="btn-icon btn-delete" data-id="${font.id}" data-action="delete">Delete</button>
                </div>
            `;
            uploadedFontsList.appendChild(item);
        });

        // Add event listeners for buttons
        uploadedFontsList!.querySelectorAll('.btn-icon').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const fontId = (e.target as HTMLElement).dataset.id;
                const action = (e.target as HTMLElement).dataset.action;
                if (!fontId) return;

                if (action === 'use') {
                    await fontSettings.loadUploadedFont(fontId);
                    if (fontTypeSelect) fontTypeSelect.value = 'upload';
                    showFontSection('upload');
                } else if (action === 'delete') {
                    if (confirm('Delete this font?')) {
                        fontSettings.deleteUploadedFont(fontId);
                        renderUploadedFontsList();
                    }
                }
            });
        });
    }

    renderUploadedFontsList();

    // Font Size Controls
    const fontSizeSlider = document.getElementById('font-size-slider') as HTMLInputElement | null;
    const fontSizeInput = document.getElementById('font-size-input') as HTMLInputElement | null;
    const fontSizeReset = document.getElementById('font-size-reset') as HTMLButtonElement | null;

    // Helper function to update both controls
    const updateFontSizeControls = (size: number): number => {
        const validSize = Math.max(50, Math.min(200, parseInt(String(size), 10) || 100));
        if (fontSizeSlider) fontSizeSlider.value = String(validSize);
        if (fontSizeInput) fontSizeInput.value = String(validSize);
        return validSize;
    };

    // Initialize with saved value
    const savedSize = fontSettings.getFontSize();
    updateFontSizeControls(savedSize);

    // Slider change handler
    if (fontSizeSlider) {
        fontSizeSlider.addEventListener('input', () => {
            const size = parseInt(fontSizeSlider.value, 10);
            if (fontSizeInput) fontSizeInput.value = String(size);
            fontSettings.setFontSize(size);
        });
    }

    // Number input change handler
    if (fontSizeInput) {
        fontSizeInput.addEventListener('change', () => {
            let size = parseInt(fontSizeInput.value, 10);
            // Clamp to valid range
            size = Math.max(50, Math.min(200, size || 100));
            updateFontSizeControls(size);
            fontSettings.setFontSize(size);
        });

        // Also update on input for real-time feedback
        fontSizeInput.addEventListener('input', () => {
            let size = parseInt(fontSizeInput.value, 10);
            if (!isNaN(size) && size >= 50 && size <= 200) {
                if (fontSizeSlider) fontSizeSlider.value = String(size);
                fontSettings.setFontSize(size);
            }
        });
    }

    if (fontSizeReset) {
        fontSizeReset.addEventListener('click', () => {
            const defaultSize = fontSettings.resetFontSize();
            updateFontSizeControls(defaultSize);
        });
    }
}

function setupSettingsSearch(): void {
    const searchInput = document.getElementById('settings-search-input') as HTMLInputElement | null;
    if (!searchInput) return;

    // Setup clear button
    const clearBtn = searchInput.parentElement?.querySelector('.search-clear-btn') as HTMLElement | null;
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }

    // Show/hide clear button based on input
    const updateClearButton = (): void => {
        if (clearBtn) {
            clearBtn.style.display = searchInput.value ? 'flex' : 'none';
        }
    };

    searchInput.addEventListener('input', () => {
        updateClearButton();
        filterSettings(searchInput.value.toLowerCase().trim());
    });

    searchInput.addEventListener('focus', updateClearButton);
}

function filterSettings(query: string): void {
    const settingsPage = document.getElementById('page-settings');
    if (!settingsPage) return;

    const allTabContents = settingsPage.querySelectorAll('.settings-tab-content');
    const allTabs = settingsPage.querySelectorAll('.settings-tab');

    if (!query) {
        // Reset: show saved active tab
        allTabContents.forEach((content) => {
            content.classList.remove('active');
        });
        allTabs.forEach((tab) => {
            tab.classList.remove('active');
        });

        // Restore saved tab as active
        const savedTabName = settingsUiState.getActiveTab();
        const savedTab = document.querySelector(`.settings-tab[data-tab="${savedTabName}"]`);
        const savedContent = document.getElementById(`settings-tab-${savedTabName}`);
        if (savedTab && savedContent) {
            savedTab.classList.add('active');
            savedContent.classList.add('active');
        } else if (allTabs[0] && allTabContents[0]) {
            // Fallback to first tab if saved tab not found
            allTabs[0].classList.add('active');
            allTabContents[0].classList.add('active');
        }

        // Show all settings groups and items
        const allGroups = settingsPage.querySelectorAll('.settings-group');
        const allItems = settingsPage.querySelectorAll('.setting-item');
        allGroups.forEach((group) => ((group as HTMLElement).style.display = ''));
        allItems.forEach((item) => ((item as HTMLElement).style.display = ''));
        return;
    }

    // When searching, show all tabs' content
    allTabContents.forEach((content) => {
        content.classList.add('active');
    });
    allTabs.forEach((tab) => {
        tab.classList.remove('active');
    });

    // Search through all settings
    const allGroups = settingsPage.querySelectorAll('.settings-group');

    allGroups.forEach((group) => {
        const items = group.querySelectorAll('.setting-item');
        let hasMatch = false;

        items.forEach((item) => {
            const label = item.querySelector('.label');
            const description = item.querySelector('.description');

            const labelText = label?.textContent?.toLowerCase() || '';
            const descriptionText = description?.textContent?.toLowerCase() || '';

            const matches = labelText.includes(query) || descriptionText.includes(query);

            if (matches) {
                (item as HTMLElement).style.display = '';
                hasMatch = true;
            } else {
                (item as HTMLElement).style.display = 'none';
            }
        });

        // Show/hide group based on whether it has any visible items
        (group as HTMLElement).style.display = hasMatch ? '' : 'none';
    });
}

function initializeBlockedContentManager(): void {
    const manageBtn = document.getElementById('manage-blocked-btn') as HTMLButtonElement | null;
    const clearAllBtn = document.getElementById('clear-all-blocked-btn') as HTMLButtonElement | null;
    const blockedListContainer = document.getElementById('blocked-content-list');
    const blockedArtistsList = document.getElementById('blocked-artists-list');
    const blockedAlbumsList = document.getElementById('blocked-albums-list');
    const blockedTracksList = document.getElementById('blocked-tracks-list');
    const blockedArtistsSection = document.getElementById('blocked-artists-section');
    const blockedAlbumsSection = document.getElementById('blocked-albums-section');
    const blockedTracksSection = document.getElementById('blocked-tracks-section');
    const blockedEmptyMessage = document.getElementById('blocked-empty-message');

    if (!manageBtn || !blockedListContainer) return;

    function renderBlockedLists(): void {
        const artists = contentBlockingSettings.getBlockedArtists();
        const albums = contentBlockingSettings.getBlockedAlbums();
        const tracks = contentBlockingSettings.getBlockedTracks();
        const totalCount = artists.length + albums.length + tracks.length;

        // Update manage button text
        if (manageBtn) manageBtn.textContent = totalCount > 0 ? `Manage (${totalCount})` : 'Manage';

        // Show/hide clear all button
        if (clearAllBtn) {
            clearAllBtn.style.display = totalCount > 0 ? 'inline-block' : 'none';
        }

        // Show/hide sections
        if (blockedArtistsSection) blockedArtistsSection.style.display = artists.length > 0 ? 'block' : 'none';
        if (blockedAlbumsSection) blockedAlbumsSection.style.display = albums.length > 0 ? 'block' : 'none';
        if (blockedTracksSection) blockedTracksSection.style.display = tracks.length > 0 ? 'block' : 'none';
        if (blockedEmptyMessage) blockedEmptyMessage.style.display = totalCount === 0 ? 'block' : 'none';

        // Render artists
        if (blockedArtistsList) {
            blockedArtistsList.innerHTML = artists
                .map(
                    (artist) => `
                <li data-id="${artist.id}" data-type="artist">
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(artist.name)}</div>
                        <div class="item-meta">${new Date(artist.blockedAt).toLocaleDateString()}</div>
                    </div>
                    <button class="unblock-btn" data-id="${artist.id}" data-type="artist">Unblock</button>
                </li>
            `
                )
                .join('');
        }

        // Render albums
        if (blockedAlbumsList) {
            blockedAlbumsList.innerHTML = albums
                .map(
                    (album) => `
                <li data-id="${album.id}" data-type="album">
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(album.title)}</div>
                        <div class="item-meta">${escapeHtml(album.artist || 'Unknown Artist')} • ${new Date(album.blockedAt).toLocaleDateString()}</div>
                    </div>
                    <button class="unblock-btn" data-id="${album.id}" data-type="album">Unblock</button>
                </li>
            `
                )
                .join('');
        }

        // Render tracks
        if (blockedTracksList) {
            blockedTracksList.innerHTML = tracks
                .map(
                    (track) => `
                <li data-id="${track.id}" data-type="track">
                    <div class="item-info">
                        <div class="item-name">${escapeHtml(track.title)}</div>
                        <div class="item-meta">${escapeHtml(track.artist || 'Unknown Artist')} • ${new Date(track.blockedAt).toLocaleDateString()}</div>
                    </div>
                    <button class="unblock-btn" data-id="${track.id}" data-type="track">Unblock</button>
                </li>
            `
                )
                .join('');
        }

        // Add unblock button handlers
        blockedListContainer!.querySelectorAll('.unblock-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = (btn as HTMLElement).dataset.id;
                const type = (btn as HTMLElement).dataset.type;
                if (!id) return;

                if (type === 'artist') {
                    contentBlockingSettings.unblockArtist(id);
                } else if (type === 'album') {
                    contentBlockingSettings.unblockAlbum(id);
                } else if (type === 'track') {
                    contentBlockingSettings.unblockTrack(id);
                }

                renderBlockedLists();
            });
        });
    }

    // Toggle blocked list visibility
    manageBtn.addEventListener('click', () => {
        const isVisible = blockedListContainer.style.display !== 'none';
        blockedListContainer.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            renderBlockedLists();
        }
    });

    // Clear all blocked content
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to unblock all artists, albums, and tracks?')) {
                contentBlockingSettings.clearAllBlocked();
                renderBlockedLists();
            }
        });
    }

    // Initial render
    renderBlockedLists();
}

function escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
