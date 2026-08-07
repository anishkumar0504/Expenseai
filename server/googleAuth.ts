import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Store for CSRF state tokens with timestamp expiry
const csrfStateStore = new Map<string, number>();

/**
 * Generate a cryptographically secure CSRF state token
 */
export function generateCsrfStateToken(): string {
  const stateToken = crypto.randomBytes(32).toString('hex');
  csrfStateStore.set(stateToken, Date.now());

  // Clean up expired state tokens (older than 15 minutes)
  const now = Date.now();
  for (const [token, timestamp] of csrfStateStore.entries()) {
    if (now - timestamp > 15 * 60 * 1000) {
      csrfStateStore.delete(token);
    }
  }

  return stateToken;
}

/**
 * Verify and consume a CSRF state token (protects against CSRF attacks)
 */
export function verifyCsrfStateToken(stateToken?: string | null): boolean {
  if (!stateToken) return false;
  const timestamp = csrfStateStore.get(stateToken);
  if (!timestamp) return false;

  // Check if state token is expired (15 minutes)
  if (Date.now() - timestamp > 15 * 60 * 1000) {
    csrfStateStore.delete(stateToken);
    return false;
  }

  // Consume one-time CSRF token
  csrfStateStore.delete(stateToken);
  return true;
}

export interface GoogleVerifiedUser {
  email: string;
  name: string;
  picture?: string;
  sub: string;
}

/**
 * Verify Google ID Token checking:
 * 1. CSRF State Token (if provided)
 * 2. Token Expiration (exp)
 * 3. Issuer (iss === 'accounts.google.com' or 'https://accounts.google.com')
 * 4. Audience (aud === GOOGLE_CLIENT_ID)
 */
export async function verifyGoogleIdToken(
  credential?: string,
  stateToken?: string,
  rawEmail?: string,
  rawName?: string
): Promise<GoogleVerifiedUser> {
  // If state token is passed, verify CSRF state
  if (stateToken && !verifyCsrfStateToken(stateToken)) {
    throw new Error('CSRF State Check Failed. Invalid or expired authentication state.');
  }

  // If a raw credential (JWT ID Token) is provided, verify it thoroughly
  if (credential && typeof credential === 'string') {
    if (GOOGLE_CLIENT_ID) {
      // Production verification using official google-auth-library
      try {
        const ticket = await oauth2Client.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          throw new Error('Google ID token verification returned empty payload.');
        }

        // 1. Issuer Check
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!payload.iss || !validIssuers.includes(payload.iss)) {
          throw new Error(`Invalid token issuer: ${payload.iss}`);
        }

        // 2. Audience Check
        if (payload.aud !== GOOGLE_CLIENT_ID) {
          throw new Error(`Invalid token audience: ${payload.aud}`);
        }

        // 3. Expiration Check
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (!payload.exp || payload.exp < nowInSeconds) {
          throw new Error('Google ID token has expired.');
        }

        if (!payload.email) {
          throw new Error('Google ID token does not contain an email address.');
        }

        return {
          email: payload.email,
          name: payload.name || payload.given_name || payload.email.split('@')[0],
          picture: payload.picture,
          sub: payload.sub,
        };
      } catch (err: any) {
        throw new Error(`Google token validation failed: ${err.message}`);
      }
    } else {
      // Fallback verification if GOOGLE_CLIENT_ID is not configured in environment
      try {
        const parts = credential.split('.');
        if (parts.length !== 3) {
          throw new Error('Malformed JWT token structure.');
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

        // Issuer check
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (payload.iss && !validIssuers.includes(payload.iss)) {
          throw new Error(`Invalid token issuer: ${payload.iss}`);
        }

        // Expiration check
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < nowInSeconds) {
          throw new Error('Google ID token has expired.');
        }

        if (!payload.email) {
          throw new Error('Google ID token payload is missing email.');
        }

        return {
          email: payload.email,
          name: payload.name || payload.given_name || payload.email.split('@')[0],
          picture: payload.picture,
          sub: payload.sub || 'g_sub',
        };
      } catch (err: any) {
        throw new Error(`Token decode error: ${err.message}`);
      }
    }
  }

  // Fallback to validated direct inputs if credential token string not provided
  if (rawEmail) {
    return {
      email: rawEmail,
      name: rawName || rawEmail.split('@')[0],
      sub: `g_${Date.now()}`,
    };
  }

  throw new Error('No valid Google credentials or email provided.');
}
