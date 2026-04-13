// @ts-check
// js/accounts/auth.js
import { auth } from './config.js';
import { OAuthProvider } from 'appwrite';

/**
 * Manages user authentication via Appwrite, supporting OAuth (Google, GitHub, Spotify, Discord)
 * and email/password sessions. Updates the account UI and notifies registered listeners on state changes.
 */
export class AuthManager {
    /**
     * Creates a new AuthManager and immediately begins resolving the current auth session.
     */
    constructor() {
        this.user = null;
        this.authListeners = [];
        this.init().catch(console.error);
    }

    /**
     * Handles the OAuth redirect handoff (exchanges userId/secret query params for a session),
     * then loads the current user and notifies all auth listeners.
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        const params = new URLSearchParams(window.location.search);
        const userId = params.get('userId');
        const secret = params.get('secret');
        const isOAuthRedirect = params.get('oauth') === '1';

        if (userId && secret && userId !== 'null' && secret !== 'null') {
            try {
                await auth.createSession(userId, secret);
                window.history.replaceState({}, '', window.location.pathname);
            } catch (error) {
                console.warn('OAuth session handoff failed:', error.message);
                window.history.replaceState({}, '', window.location.pathname);
            }
        } else if (isOAuthRedirect) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            window.history.replaceState({}, '', window.location.pathname);
        }

        try {
            this.user = await auth.get();
            this.updateUI(this.user);
            this.authListeners.forEach((listener) => listener(this.user));
        } catch {
            this.user = null;
            this.updateUI(null);
        }
    }

    /**
     * Registers a callback to be invoked whenever the auth state changes.
     * If a user state is already known, the callback is called immediately with the current value.
     * @param {(user: object | null) => void} callback - Function called with the current user object, or `null` when signed out
     * @returns {void}
     */
    onAuthStateChanged(callback) {
        this.authListeners.push(callback);
        // If we already have a user state, trigger immediately
        if (this.user !== null) {
            callback(this.user);
        }
    }

    /**
     * Initiates an OAuth 2.0 sign-in flow with Google.
     * Redirects the browser; does not return a value on success.
     * @async
     * @returns {Promise<void>}
     */
    async signInWithGoogle() {
        try {
            auth.createOAuth2Session(
                OAuthProvider.Google,
                window.location.origin + '/index.html?oauth=1',
                window.location.origin + '/login.html'
            );
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    /**
     * Initiates an OAuth 2.0 sign-in flow with GitHub.
     * Redirects the browser; does not return a value on success.
     * @async
     * @returns {Promise<void>}
     */
    async signInWithGitHub() {
        try {
            auth.createOAuth2Session(
                OAuthProvider.Github,
                window.location.origin + '/index.html?oauth=1',
                window.location.origin + '/login.html'
            );
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    /**
     * Initiates an OAuth 2.0 sign-in flow with Spotify.
     * Redirects the browser; does not return a value on success.
     * @async
     * @returns {Promise<void>}
     */
    async signInWithSpotify() {
        try {
            auth.createOAuth2Session(
                OAuthProvider.Spotify,
                window.location.origin + '/index.html?oauth=1',
                window.location.origin + '/login.html'
            );
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    /**
     * Initiates an OAuth 2.0 sign-in flow with Discord.
     * Redirects the browser; does not return a value on success.
     * @async
     * @returns {Promise<void>}
     */
    async signInWithDiscord() {
        try {
            auth.createOAuth2Session(
                OAuthProvider.Discord,
                window.location.origin + '/index.html?oauth=1',
                window.location.origin + '/login.html'
            );
        } catch (error) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    /**
     * Creates an email/password session and updates internal state and UI.
     * @async
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<object>} The authenticated user object
     * @throws {Error} If the Appwrite session creation fails
     */
    async signInWithEmail(email, password) {
        try {
            await auth.createEmailPasswordSession(email, password);
            this.user = await auth.get();
            this.updateUI(this.user);
            this.authListeners.forEach((listener) => listener(this.user));
            return this.user;
        } catch (error) {
            console.error('Email Login failed:', error);
            alert(`Login failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates a new Appwrite account, then immediately signs in and updates state and UI.
     * @async
     * @param {string} email - New account email address
     * @param {string} password - New account password
     * @returns {Promise<object>} The newly created and authenticated user object
     * @throws {Error} If account creation or the subsequent sign-in fails
     */
    async signUpWithEmail(email, password) {
        try {
            await auth.create('unique()', email, password);
            await auth.createEmailPasswordSession(email, password);
            this.user = await auth.get();
            this.updateUI(this.user);
            this.authListeners.forEach((listener) => listener(this.user));
            return this.user;
        } catch (error) {
            console.error('Sign Up failed:', error);
            alert(`Sign Up failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Sends a password-reset email to the given address.
     * @async
     * @param {string} email - Email address to send the reset link to
     * @returns {Promise<void>}
     * @throws {Error} If the Appwrite recovery request fails
     */
    async sendPasswordReset(email) {
        try {
            await auth.createRecovery(email, window.location.origin + '/reset-password');
            alert(`Password reset email sent to ${email}`);
        } catch (error) {
            console.error('Password reset failed:', error);
            alert(`Failed to send reset email: ${error.message}`);
            throw error;
        }
    }

    /**
     * Deletes the current Appwrite session, clears local user state, and reloads or redirects.
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If the Appwrite session deletion fails
     */
    async signOut() {
        try {
            await auth.deleteSession('current');
            this.user = null;
            this.updateUI(null);
            this.authListeners.forEach((listener) => listener(null));

            if (window.__AUTH_GATE__) {
                window.location.href = '/login';
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    /**
     * Updates the account page UI to reflect the current authentication state.
     * Shows/hides sign-in buttons, the sign-out button, status text, and email auth fields
     * based on whether a user is signed in and whether the auth-gate mode is active.
     * @param {object | null} user - Currently authenticated Appwrite user, or `null` when signed out
     * @returns {void}
     */
    updateUI(user) {
        const connectBtn = document.getElementById('auth-connect-btn');
        const clearDataBtn = document.getElementById('auth-clear-cloud-btn');
        const statusText = document.getElementById('auth-status');
        const emailContainer = document.getElementById('email-auth-container');
        const emailToggleBtn = document.getElementById('toggle-email-auth-btn');
        const githubBtn = document.getElementById('auth-github-btn');
        const discordBtn = document.getElementById('auth-discord-btn');

        if (!connectBtn) return;

        if (window.__AUTH_GATE__) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();
            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';
            if (githubBtn) githubBtn.style.display = 'none';
            if (discordBtn) discordBtn.style.display = 'none';
            if (statusText) statusText.textContent = user ? `Signed in as ${user.email}` : 'Signed in';

            const accountPage = document.getElementById('page-account');
            if (accountPage) {
                const title = accountPage.querySelector('.section-title');
                if (title) title.textContent = 'Account';
                accountPage.querySelectorAll('.account-content > p, .account-content > div').forEach((el) => {
                    if (el.id !== 'auth-status' && el.id !== 'auth-buttons-container') {
                        /** @type {HTMLElement} */ (el).style.display = 'none';
                    }
                });
            }

            const customDbBtn = document.getElementById('custom-db-btn');
            if (customDbBtn) {
                const pbFromEnv = !!window.__POCKETBASE_URL__;
                if (pbFromEnv) {
                    const settingItem = customDbBtn.closest('.setting-item');
                    if (settingItem) /** @type {HTMLElement} */ (settingItem).style.display = 'none';
                }
            }

            return;
        }

        if (user) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();

            if (clearDataBtn) clearDataBtn.style.display = 'block';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';
            if (githubBtn) githubBtn.style.display = 'none';
            if (discordBtn) discordBtn.style.display = 'none';
            if (statusText) statusText.textContent = `Signed in as ${user.email}`;
        } else {
            connectBtn.textContent = 'Connect with Google';
            connectBtn.classList.remove('danger');
            connectBtn.onclick = () => this.signInWithGoogle();

            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'inline-block';
            if (githubBtn) {
                githubBtn.style.display = 'inline-block';
                githubBtn.onclick = () => this.signInWithGitHub();
            }
            if (discordBtn) {
                discordBtn.style.display = 'inline-block';
                discordBtn.onclick = () => this.signInWithDiscord();
            }
            if (statusText) statusText.textContent = 'Sync your library across devices';
        }
    }
}

export const authManager = new AuthManager();
