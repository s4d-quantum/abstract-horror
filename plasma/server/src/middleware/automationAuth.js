import crypto from 'node:crypto';
import { ensureAutomationRobotUser } from '../services/automationSchema.service.js';

function safeCompareSecrets(receivedSecret, expectedSecret) {
  const receivedBuffer = Buffer.from(receivedSecret, 'utf8');
  const expectedBuffer = Buffer.from(expectedSecret, 'utf8');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export async function automationAuth(req, res, next) {
  const expectedSecret = process.env.PLASMA_AUTOMATION_KEY;
  const receivedSecret = req.headers['x-plasma-robot-key'];

  if (!expectedSecret) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'AUTOMATION_KEY_NOT_CONFIGURED',
        message: 'Automation key is not configured',
      },
    });
  }

  if (typeof receivedSecret !== 'string' || !safeCompareSecrets(receivedSecret, expectedSecret)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTOMATION_UNAUTHORIZED',
        message: 'Unauthorized automation request',
      },
    });
  }

  try {
    const robotUser = await ensureAutomationRobotUser();
    if (!robotUser) {
      throw new Error('Automation robot user could not be loaded');
    }

    req.user = {
      id: robotUser.id,
      username: robotUser.username,
      display_name: robotUser.display_name,
      role: robotUser.role,
    };

    next();
  } catch (error) {
    next(error);
  }
}
