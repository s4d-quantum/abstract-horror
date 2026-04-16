export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';

  // MySQL errors
  if (err.code?.startsWith('ER_')) {
    statusCode = 400;
    code = 'DATABASE_ERROR';

    // Handle specific MySQL errors
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        message = 'Duplicate entry. This record already exists.';
        code = 'DUPLICATE_ENTRY';
        break;
      case 'ER_NO_REFERENCED_ROW_2':
        message = 'Referenced record does not exist.';
        code = 'INVALID_REFERENCE';
        break;
      case 'ER_ROW_IS_REFERENCED_2':
        message = 'Cannot delete record. It is referenced by other records.';
        code = 'REFERENCE_CONSTRAINT';
        break;
      default:
        if (process.env.NODE_ENV === 'production') {
          message = 'Database operation failed.';
        }
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
    code = 'TOKEN_EXPIRED';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
}
