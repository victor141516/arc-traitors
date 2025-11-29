import jwt from "jsonwebtoken";
import { getJwtSecret, getAdminPassword } from "./config";

const JWT_SECRET = getJwtSecret();
const TOKEN_EXPIRATION = "24h"; // Tokens expire after 24 hours

interface TokenPayload {
  admin: boolean;
  iat: number;
  exp: number;
}

/**
 * Verify the admin password and generate a JWT token
 */
export function verifyPasswordAndGenerateToken(
  password: string
): string | null {
  if (password !== getAdminPassword()) {
    return null;
  }

  // Generate JWT token
  const token = jwt.sign({ admin: true }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  });

  return token;
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded.admin === true;
  } catch (error) {
    // Token is invalid or expired
    return false;
  }
}

/**
 * Decode token to get expiration info (without verification)
 */
export function getTokenInfo(token: string): {
  valid: boolean;
  expiresAt?: Date;
} {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return {
      valid: true,
      expiresAt: new Date(decoded.exp * 1000),
    };
  } catch (error) {
    return { valid: false };
  }
}
