import { describe, expect, it } from 'vitest';
import { getApiErrorCode, getApiErrorMessage } from '../../client/src/lib/errors';

describe('API error helpers', () => {
  it('prefers the nested structured error response', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'INVALID_STATUS',
            message: 'Structured message',
          },
          message: 'Legacy message',
        },
      },
      message: 'Network message',
    };

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Structured message');
    expect(getApiErrorCode(error)).toBe('INVALID_STATUS');
  });

  it('falls back to the legacy top-level message shape', () => {
    const error = {
      response: {
        data: {
          message: 'Legacy message',
          code: 'LEGACY_CODE',
        },
      },
      message: 'Network message',
    };

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Legacy message');
    expect(getApiErrorCode(error)).toBe('LEGACY_CODE');
  });

  it('uses the thrown error message when the response body is missing', () => {
    const error = new Error('Network exploded');

    expect(getApiErrorMessage(error, 'Fallback')).toBe('Network exploded');
    expect(getApiErrorCode(error)).toBeUndefined();
  });
});
