/** Sign in with Google is offered only when the website knows the OAuth client ID. */
export const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';
export const googleSignInAvailable = Boolean(GOOGLE_CLIENT_ID);
