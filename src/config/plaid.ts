import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Map environment strings to Plaid environments
const getPlaidEnvironment = (env: string) => {
    const envMap: { [key: string]: string } = {
        'sandbox': PlaidEnvironments.sandbox,
        'development': PlaidEnvironments.development,
        'production': PlaidEnvironments.production
    };
    return envMap[env] || PlaidEnvironments.sandbox;
};

const configuration = new Configuration({
    basePath: getPlaidEnvironment(process.env.PLAID_ENV || 'sandbox'),
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});

export const plaidClient = new PlaidApi(configuration);

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];
export const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || '';

export const plaidConfig = {
    clientId: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
    env: process.env.PLAID_ENV || 'sandbox',
    products: PLAID_PRODUCTS,
    countryCodes: PLAID_COUNTRY_CODES,
    redirectUri: PLAID_REDIRECT_URI,
}; 