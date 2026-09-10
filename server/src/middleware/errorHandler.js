const multer = require('multer');

function notFound(req, res, next) {
  res.status(404).json({ message: 'Route not found' });
}

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'File is too large.',
  LIMIT_UNEXPECTED_FILE: 'Unexpected file field.',
};

function errorHandler(err, req, res, next) {
  console.error(err.message);

  // Multer's own errors (size limit, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    const message = MULTER_MESSAGES[err.code] || 'Upload failed. Please try again.';
    return res.status(400).json({ message });
  }

  // Mongoose validation errors, e.g. "Message must contain text or an attachment"
  if (err.name === 'ValidationError') {
    const firstMessage = Object.values(err.errors || {})[0]?.message || err.message;
    return res.status(400).json({ message: firstMessage });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };