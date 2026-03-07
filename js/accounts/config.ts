import { Client, Account } from 'appwrite';

const getEndpoint = (): string => {
    const hostname = window.location.hostname;
    if (hostname.endsWith('monochrome.tf') || hostname === 'monochrome.tf') {
        return 'https://auth.monochrome.tf/v1';
    }
    return 'https://auth.samidy.com/v1';
};

const client = new Client().setEndpoint(getEndpoint()).setProject('auth-for-monochrome');

const account = new Account(client);
export { client, account as auth };
// TODO: These stubs exist for backward compatibility during the Firebase→Appwrite migration.
// They should be removed once all call sites are updated to use Appwrite auth directly.
export const saveFirebaseConfig = (_config?: Record<string, string> | null): void => {
    console.log('[config] saveFirebaseConfig is a no-op; using Appwrite auth');
};
export const clearFirebaseConfig = (): void => {
    console.log('[config] clearFirebaseConfig is a no-op; using Appwrite auth');
};
