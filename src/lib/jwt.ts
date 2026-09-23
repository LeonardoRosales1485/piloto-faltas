import { SignJWT, jwtVerify } from 'jose';

const EXPIRATION = '24h'; // matches app.jwt.expiration-ms: 86400000

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET');
  }
  return new TextEncoder().encode(secret);
}

/** Issue JWT with username as subject (same as Spring JwtService). */
export async function issueToken(username: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(getSecret());
}

export async function subjectFromToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (!payload.sub) {
    throw new Error('Token without subject');
  }
  return payload.sub;
}
