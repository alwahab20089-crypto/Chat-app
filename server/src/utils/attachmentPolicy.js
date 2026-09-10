// Explicit allowlist. Anything not listed here is rejected, regardless of
// what the client claims its mimetype is.
const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

// Belt-and-suspenders: even if a mimetype were spoofed, these extensions are
// never allowed through, full stop.
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.dll', '.scr', '.com',
  '.jar', '.js', '.vbs', '.ps1', '.app', '.apk', '.bin',
];

const IMAGE_MAX_SIZE = parseInt(process.env.IMAGE_MAX_SIZE, 10) || 5 * 1024 * 1024; // 5MB
const FILE_MAX_SIZE = parseInt(process.env.FILE_MAX_SIZE, 10) || 15 * 1024 * 1024; // 15MB

function getExtension(filename = '') {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

function classifyMime(mimetype) {
  if (IMAGE_TYPES[mimetype]) return 'image';
  if (FILE_TYPES[mimetype]) return 'file';
  return null;
}

// Strips path separators/control chars so the original filename is safe to
// store and display. Never used to build a filesystem or Cloudinary path.
function sanitizeOriginalName(name = 'file') {
  const cleaned = name
    .replace(/[\/\\]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  return cleaned.slice(0, 255) || 'file';
}

function humanFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

module.exports = {
  IMAGE_TYPES,
  FILE_TYPES,
  DANGEROUS_EXTENSIONS,
  IMAGE_MAX_SIZE,
  FILE_MAX_SIZE,
  getExtension,
  classifyMime,
  sanitizeOriginalName,
  humanFileSize,
};