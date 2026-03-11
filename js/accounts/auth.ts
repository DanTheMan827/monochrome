// js/accounts/auth.ts
import { auth } from './config.js';

declare global {
    interface Window {
        __AUTH_GATE__?: boolean;
        __POCKETBASE_URL__?: string;
    }
}

interface AppwriteUser {
    email?: string;
    name?: string;
    $id?: string;
}

type AuthListener = (user: AppwriteUser | null) => void;

export class AuthManager {
    user: AppwriteUser | null;
    authListeners: AuthListener[];

    constructor() {
        this.user = null;
        this.authListeners = [];
        this.init();
    }

    async init(): Promise<void> {
        const params: URLSearchParams = new URLSearchParams(window.location.search);
        const userId: string | null = params.get('userId');
        const secret: string | null = params.get('secret');
        const isOAuthRedirect: boolean = params.get('oauth') === '1';

        if (userId && secret && userId !== 'null' && secret !== 'null') {
            try {
                await auth.createSession(userId, secret);
                window.history.replaceState({}, '', window.location.pathname);
            } catch (error: any) {
                console.warn('OAuth session handoff failed:', error.message);
                window.history.replaceState({}, '', window.location.pathname);
            }
        } else if (isOAuthRedirect) {
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
            window.history.replaceState({}, '', window.location.pathname);
        }

        try {
            this.user = await auth.get();
            this.updateUI(this.user);
            this.authListeners.forEach((listener: AuthListener) => listener(this.user));
        } catch {
            this.user = null;
            this.updateUI(null);
        }
    }

    onAuthStateChanged(callback: AuthListener): void {
        this.authListeners.push(callback);
        // If we already have a user state, trigger immediately
        if (this.user !== null) {
            callback(this.user);
        }
    }

    async signInWithGoogle(): Promise<void> {
        try {
            auth.createOAuth2Session(
                'google' as any,
                window.location.origin + '/index.html?oauth=1',
                window.location.origin + '/login.html'
            );
        } catch (error: any) {
            console.error('Login failed:', error);
            alert(`Login failed: ${error.message}`);
        }
    }

    async signInWithEmail(email: string, password: string): Promise<AppwriteUser> {
        try {
            await auth.createEmailPasswordSession(email, password);
            this.user = await auth.get();
            this.updateUI(this.user);
            this.authListeners.forEach((listener: AuthListener) => listener(this.user));
            return this.user;
        } catch (error: any) {
            console.error('Email Login failed:', error);
            alert(`Login failed: ${error.message}`);
            throw error;
        }
    }

    async signUpWithEmail(email: string, password: string): Promise<AppwriteUser> {
        try {
            await auth.create('unique()', email, password);
            await auth.createEmailPasswordSession(email, password);
            this.user = await auth.get();
            this.updateUI(this.user);
            this.authListeners.forEach((listener: AuthListener) => listener(this.user));
            return this.user;
        } catch (error: any) {
            console.error('Sign Up failed:', error);
            alert(`Sign Up failed: ${error.message}`);
            throw error;
        }
    }

    async sendPasswordReset(email: string): Promise<void> {
        try {
            await auth.createRecovery(email, window.location.origin + '/reset-password.html');
            alert(`Password reset email sent to ${email}`);
        } catch (error: any) {
            console.error('Password reset failed:', error);
            alert(`Failed to send reset email: ${error.message}`);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        try {
            await auth.deleteSession('current');
            this.user = null;
            this.updateUI(null);
            this.authListeners.forEach((listener: AuthListener) => listener(null));

            if (window.__AUTH_GATE__) {
                window.location.href = '/login';
            } else {
                window.location.reload();
            }
        } catch (error: any) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    updateUI(user: AppwriteUser | null): void {
        const connectBtn: HTMLElement | null = document.getElementById('firebase-connect-btn');
        const clearDataBtn: HTMLElement | null = document.getElementById('firebase-clear-cloud-btn');
        const statusText: HTMLElement | null = document.getElementById('firebase-status');
        const emailContainer: HTMLElement | null = document.getElementById('email-auth-container');
        const emailToggleBtn: HTMLElement | null = document.getElementById('toggle-email-auth-btn');

        if (!connectBtn) return;

        if (window.__AUTH_GATE__) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();
            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';
            if (statusText) statusText.textContent = user ? `Signed in as ${user.email}` : 'Signed in';

            const accountPage: HTMLElement | null = document.getElementById('page-account');
            if (accountPage) {
                const title: Element | null = accountPage.querySelector('.section-title');
                if (title) title.textContent = 'Account';
                accountPage.querySelectorAll('.account-content > p, .account-content > div').forEach((el: Element) => {
                    if (el.id !== 'firebase-status' && el.id !== 'auth-buttons-container') {
                        (el as HTMLElement).style.display = 'none';
                    }
                });
            }

            const customDbBtn: HTMLElement | null = document.getElementById('custom-db-btn');
            if (customDbBtn) {
                const pbFromEnv: boolean = !!window.__POCKETBASE_URL__;
                if (pbFromEnv) {
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

export const authManager: AuthManager = new AuthManager();
