// js/accounts/auth.ts
import { auth, provider } from './config.ts';
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import type { FirebaseUser } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

type AuthListener = (user: FirebaseUser | null) => void;

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function getErrorCode(error: unknown): string | undefined {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        return String((error as { code: unknown }).code);
    }
    return undefined;
}

export class AuthManager {
    user: FirebaseUser | null;
    unsubscribe: (() => void) | null;
    authListeners: AuthListener[];

    constructor() {
        this.user = null;
        this.unsubscribe = null;
        this.authListeners = [];
        this.init();
    }

    init(): void {
        if (!auth) return;

        this.unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
            this.user = user;
            this.updateUI(user);

            this.authListeners.forEach((listener: AuthListener) => listener(user));
        });

        // Handle redirect result (for Linux/Mobile where popup might be blocked)
        getRedirectResult(auth).catch((error: unknown) => {
            console.error('Redirect Login failed:', error);
            alert(`Login failed: ${getErrorMessage(error)}`);
        });
    }

    onAuthStateChanged(callback: AuthListener): void {
        this.authListeners.push(callback);
        // If we already have a user state, trigger immediately
        if (this.user !== null) {
            callback(this.user);
        }
    }

    async signInWithGoogle(): Promise<FirebaseUser | undefined> {
        if (!auth || !provider) {
            alert('Firebase is not configured. Please check console.');
            return;
        }

        try {
            const result = await signInWithPopup(auth, provider);

            if (result.user) {
                console.log('Login successful:', result.user.email);
                this.user = result.user;
                this.updateUI(result.user);
                this.authListeners.forEach((listener: AuthListener) => listener(result.user));
                return result.user;
            }
        } catch (error: unknown) {
            console.error('Login failed:', error);

            // On Linux, if popup is blocked or fails, we might be forced to redirect,
            // but we've seen it "bug the app", so we alert the user first.
            const code: string | undefined = getErrorCode(error);
            if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
                if (
                    confirm(
                        'The login popup was blocked or failed to communicate. Would you like to try a redirect instead? Note: This may reload the application.'
                    )
                ) {
                    try {
                        await signInWithRedirect(auth, provider);
                        return;
                    } catch (redirectError: unknown) {
                        console.error('Redirect fallback failed:', redirectError);
                        alert(`Login failed: ${getErrorMessage(redirectError)}`);
                    }
                }
            } else {
                alert(`Login failed: ${getErrorMessage(error)}`);
            }
            throw error;
        }
    }

    async signInWithEmail(email: string, password: string): Promise<FirebaseUser | undefined> {
        if (!auth) {
            alert('Firebase is not configured.');
            return;
        }
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error: unknown) {
            console.error('Email Login failed:', error);
            alert(`Login failed: ${getErrorMessage(error)}`);
            throw error;
        }
    }

    async signUpWithEmail(email: string, password: string): Promise<FirebaseUser | undefined> {
        if (!auth) {
            alert('Firebase is not configured.');
            return;
        }
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error: unknown) {
            console.error('Sign Up failed:', error);
            alert(`Sign Up failed: ${getErrorMessage(error)}`);
            throw error;
        }
    }

    async sendPasswordReset(email: string): Promise<void> {
        if (!auth) {
            alert('Firebase is not configured.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            alert(`Password reset email sent to ${email}`);
        } catch (error: unknown) {
            console.error('Password reset failed:', error);
            alert(`Failed to send reset email: ${getErrorMessage(error)}`);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        if (!auth) return;

        try {
            await firebaseSignOut(auth);
            if (window.__AUTH_GATE__) {
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch {
                    // Server endpoint may not exist in dev mode
                }
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    updateUI(user: FirebaseUser | null): void {
        const connectBtn: HTMLElement | null = document.getElementById('firebase-connect-btn');
        const clearDataBtn: HTMLElement | null = document.getElementById('firebase-clear-cloud-btn');
        const statusText: HTMLElement | null = document.getElementById('firebase-status');
        const emailContainer: HTMLElement | null = document.getElementById('email-auth-container');
        const emailToggleBtn: HTMLElement | null = document.getElementById('toggle-email-auth-btn');

        if (!connectBtn) return; // UI might not be rendered yet

        // Auth gate active: strip down to status + sign out only
        if (window.__AUTH_GATE__) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();
            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';
            if (statusText) statusText.textContent = user ? `Signed in as ${user.email}` : 'Signed in';

            // Account page: clean up unnecessary text
            const accountPage: HTMLElement | null = document.getElementById('page-account');
            if (accountPage) {
                const title: Element | null = accountPage.querySelector('.section-title');
                if (title) title.textContent = 'Account';
                // Hide description + privacy paragraphs, keep only status
                accountPage
                    .querySelectorAll<HTMLElement>('.account-content > p, .account-content > div')
                    .forEach((el: HTMLElement) => {
                        if (el.id !== 'firebase-status' && el.id !== 'auth-buttons-container') {
                            el.style.display = 'none';
                        }
                    });
            }

            // Settings page: hide custom DB/Auth config when fully server-configured
            const customDbBtn: HTMLElement | null = document.getElementById('custom-db-btn');
            if (customDbBtn) {
                const fbFromEnv: boolean = !!window.__FIREBASE_CONFIG__;
                const pbFromEnv: boolean = !!window.__POCKETBASE_URL__;
                if (fbFromEnv && pbFromEnv) {
                    const settingItem: HTMLElement | null = customDbBtn.closest('.setting-item');
                    if (settingItem) settingItem.style.display = 'none';
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

            if (statusText) statusText.textContent = `Signed in as ${user.email}`;
        } else {
            connectBtn.textContent = 'Connect with Google';
            connectBtn.classList.remove('danger');
            connectBtn.onclick = () => this.signInWithGoogle();

            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'inline-block';

            if (statusText) statusText.textContent = 'Sync your library across devices';
        }
    }
}

export const authManager = new AuthManager();
