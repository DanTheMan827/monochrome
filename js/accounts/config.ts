// js/accounts/config.ts
import { Client, Account } from 'appwrite';

const getEndpoint = (): string => {
    const hostname = window.location.hostname;
    if (hostname.endsWith('monochrome.tf') || hostname === 'monochrome.tf') {
        return 'https://auth.monochrome.tf/v1';
    }
    return 'https://auth.samidy.com/v1';
};

const client: Client = new Client().setEndpoint(getEndpoint()).setProject('auth-for-monochrome');

const account: Account = new Account(client);

export { client, account as auth };

export const saveFirebaseConfig = (_config?: unknown): void => {
    console.log('ill fix this tomorrow');
};

export const clearFirebaseConfig = (): void => {
    console.log('ill fix this tomorrow');
};
