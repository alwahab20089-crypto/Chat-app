// Mirrors the backend allowlist (server/src/utils/attachmentPolicy.js) so the
// UI can reject obviously-bad files before spending a request. The backend
// remains the source of truth — this is a UX convenience only.

export const IMAGE_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const FILE_MIME_TO_EXT = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

// Keep these in sync with server env vars IMAGE_MAX_SIZE / FILE_MAX_SIZE.
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
export const FILE_MAX_SIZE = 15 * 1024 * 1024; // 15MB

export const ACCEPT_ATTR = [
  ...Object.keys(IMAGE_MIME_TO_EXT),
  ...Object.keys(FILE_MIME_TO_EXT),
].join(',');

function getExtension(filename = '') {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

function classifyMime(mimetype) {
  if (IMAGE_MIME_TO_EXT[mimetype]) return 'image';
  if (FILE_MIME_TO_EXT[mimetype]) return 'file';
  return null;
}

// Returns { valid: true, category: 'image' | 'file' } or { valid: false, error }
export function validateAttachmentFile(file) {
  if (!file) return { valid: false, error: 'No file selected' };

  const category = classifyMime(file.type);
  const ext = getExtension(file.name);
  const allowedExts = [...Object.values(IMAGE_MIME_TO_EXT), ...Object.values(FILE_MIME_TO_EXT)];

  if (!category || (ext && !allowedExts.includes(ext))) {
    return { valid: false, error: "This file type isn't supported." };
  }

  const sizeLimit = category === 'image' ? IMAGE_MAX_SIZE : FILE_MAX_SIZE;
  if (file.size > sizeLimit) {
    return { valid: false, error: 'File is too large.' };
  }

  return { valid: true, category };
}

export function humanFileSize(bytes) {
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

export function fileExtensionLabel(originalName = '') {
  const ext = getExtension(originalName).replace('.', '').toUpperCase();
  return ext || 'FILE';
}

// Mirrors the backend's previewText() so optimistic/local conversation-list
// updates match what a refetch from the server would show.
export function getMessagePreview(message) {
  if (!message) return '';
  if (message.isDeleted) return 'This message was deleted';
  if (message.messageType === 'image') {
    return message.content?.trim() ? `📷 ${message.content.trim()}` : '📷 Image';
  }
  if (message.messageType === 'file') {
    return message.attachment?.originalName ? `📎 ${message.attachment.originalName}` : '📎 File';
  }
  return message.content || '';
}
// Cloudinary ignores the browser's `download` attribute for cross-origin
// URLs (which Cloudinary always is), so the save-as filename has to come
// from Cloudinary's own Content-Disposition header instead — the
// fl_attachment delivery flag does that.
export function withDownloadFlag(url, filename) {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const nameWithoutExt = (filename || '').replace(/\.[^/.]+$/, '');
  const flag = nameWithoutExt ? `fl_attachment:${encodeURIComponent(nameWithoutExt)}` : 'fl_attachment';

  return `${url.slice(0, idx + marker.length)}${flag}/${url.slice(idx + marker.length)}`;
}
// Short summary line for a reply target/snapshot — used both in the
// composer's "Replying to..." bar and inside a sent reply's bubble preview.
export function replySnapshotSummary(messageType, content, attachmentLabel) {
  const text = (content || '').trim();
  if (messageType === 'image') return text || 'Photo';
  if (messageType === 'file') return attachmentLabel || 'File';
  return text || 'Message';
}