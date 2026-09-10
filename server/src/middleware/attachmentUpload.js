const multer = require('multer');
const {
  IMAGE_TYPES,
  FILE_TYPES,
  DANGEROUS_EXTENSIONS,
  FILE_MAX_SIZE,
  getExtension,
  classifyMime,
} = require('../utils/attachmentPolicy');

const storage = multer.memoryStorage();

function rejectionError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

function fileFilter(req, file, cb) {
  const ext = getExtension(file.originalname);

  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return cb(rejectionError('This file type is not allowed'), false);
  }

  const category = classifyMime(file.mimetype);
  if (!category) {
    return cb(rejectionError("This file type isn't supported"), false);
  }

  const allowedExts = Object.values({ ...IMAGE_TYPES, ...FILE_TYPES });
  if (ext && !allowedExts.includes(ext)) {
    return cb(rejectionError("This file type isn't supported"), false);
  }

  file.attachmentCategory = category; // 'image' | 'file' — used downstream
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_MAX_SIZE },
});

module.exports = upload;