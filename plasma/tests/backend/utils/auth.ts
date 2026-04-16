import jwt from 'jsonwebtoken';

export function getAuthHeader(payload: Record<string, any> = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET must be configured for backend tests.');
  }

  const token = jwt.sign(
    {
      id: 1,
      username: 'test_admin',
      role: 'ADMIN',
      ...payload,
    },
    secret,
  );

  return `Bearer ${token}`;
}
