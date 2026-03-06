// js/accounts/config.ts
import { Client, Account } from 'appwrite';

const client: Client = new Client().setEndpoint('https://auth.samidy.xyz/v1').setProject('auth-for-monochrome');

const account: Account = new Account(client);

export { client, account as auth };

export const saveFirebaseConfig = (_config?: unknown): void => {
    console.log('ill fix this tomorrow');
};

export const clearFirebaseConfig = (): void => {
    console.log('ill fix this tomorrow');
};
