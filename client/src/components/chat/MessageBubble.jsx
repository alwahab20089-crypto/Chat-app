// src/components/chat/MessageBubble.jsx
import { useState } from 'react';
import {
  Check, CheckCheck, FileText, FileSpreadsheet, FileArchive, File as FileIcon,
  Download, X, Reply as ReplyIcon, Pencil, Trash2,
  Pin, PinOff,
} from 'lucide-react';
import { formatMessageTime } from '../../utils/formatTime';
import { humanFileSize, fileExtensionLabel, withDownloadFlag, replySnapshotSummary } from '../../utils/attachmentPolicy';
import ReactionPicker from './ReactionPicker';
import MessageReactions from './MessageReactions';
const STATUS_LABEL = { sent: 'Sent', delivered: 'Delivered', read: 'Read' };

function StatusTicks({ status }) {
  const label = STATUS_LABEL[status] || STATUS_LABEL.sent;

  if (status === 'read') {
    return (
      <span role="img" aria-label={label}>
        <CheckCheck className="h-3.5 w-3.5 text-neon-fuchsia-bright drop-shadow-[0_0_3px_rgba(246,76,114,0.8)]" />
      </span>
    );
  }

  if (status === 'delivered') {
    return (
      <span role="img" aria-label={label}>
        <CheckCheck className="h-3.5 w-3.5 text-white/70" />
      </span>
    );
  }

  return (
    <span role="img" aria-label={label}>
      <Check className="h-3.5 w-3.5 text-white/70" />
    </span>
  );
}

function FileTypeIcon({ originalName, className }) {
  const ext = fileExtensionLabel(originalName).toLowerCase();
  if (ext === 'pdf' || ext === 'doc' || ext === 'docx' || ext === 'txt') return <FileText className={className} />;
  if (ext === 'xls' || ext === 'xlsx') return <FileSpreadsheet className={className} />;
  if (ext === 'zip') return <FileArchive className={className} />;
  return <FileIcon className={className} />;
}

function ImageAttachment({ attachment, caption, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={caption ? `Open image: ${caption}` : 'Open image attachment'}
      className="group block overflow-hidden rounded-xl"
    >
      <img
        src={attachment.url}
        alt={caption || 'Image attachment'}
        loading="lazy"
        className="max-h-72 w-full max-w-[260px] object-cover transition-transform duration-500 ease-premium group-hover:scale-105 sm:max-w-[300px]"
      />
    </button>
  );
}

function FileAttachment({ attachment, isOwn }) {
  return (
    <a
      href={withDownloadFlag(attachment.url, attachment.originalName)}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.originalName}
      className={`group flex items-center gap-2.5 rounded-xl border p-2.5 transition-all duration-300 ease-premium hover:-translate-y-0.5 ${
        isOwn ? 'border-white/20 bg-white/10 hover:bg-white/15' : 'border-neon-aqua/15 bg-obsidian-light hover:border-neon-aqua/40'
      }`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 ease-premium group-hover:scale-110 ${isOwn ? 'bg-white/15' : 'bg-neon-aqua/15'}`}>
        <FileTypeIcon
          originalName={attachment.originalName}
          className={`h-4 w-4 ${isOwn ? 'text-white' : 'text-neon-aqua-bright'}`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-medium ${isOwn ? 'text-white' : 'text-gray-100'}`}>
          {attachment.originalName}
        </p>
        <p className={`text-[11px] ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
          {fileExtensionLabel(attachment.originalName)} • {humanFileSize(attachment.size)}
        </p>
      </div>
      <Download className={`h-4 w-4 shrink-0 ${isOwn ? 'text-white' : 'text-gray-500'}`} aria-hidden="true" />
    </a>
  );
}

function Lightbox({ url, alt, onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Image preview'}
      onClick={onClose}
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <button
        onClick={onClose}
        aria-label="Close image preview"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-all duration-200 ease-premium hover:scale-110 hover:bg-neon-fuchsia/30"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        alt={alt || 'Image attachment'}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-glow-aqua-lg"
      />
    </div>
  );
}

// PHASE 10 — compact reference to the original message, rendered inside a
// reply's bubble.
// PHASE 11 — the backend now tells us explicitly whether the original was
// deleted (`replyTo.isDeleted`), so we no longer have to guess from
// missing fields (Section 18).
function ReplyPreview({ replyTo, isOwn, otherUserName, currentUserId, onJump }) {
  if (!replyTo) return null;

  if (replyTo.isDeleted || !replyTo.messageType) {
    return (
      <div
        className={`mb-1.5 rounded-lg border-l-2 px-2.5 py-1.5 text-xs italic ${
          isOwn ? 'border-white/40 bg-white/10 text-white/70' : 'border-gray-600 bg-obsidian-light text-gray-500'
        }`}
      >
        {replyTo.isDeleted ? 'This message was deleted' : 'Original message unavailable'}
      </div>
    );
  }

  const senderLabel = replyTo.sender?.toString() === currentUserId?.toString() ? 'You' : otherUserName || 'them';
  const summary = replySnapshotSummary(replyTo.messageType, replyTo.content, replyTo.attachmentName);

  return (
    <button
      type="button"
      onClick={() => onJump?.(replyTo.messageId)}
      aria-label={`View original message from ${senderLabel}`}
      className={`mb-1.5 block w-full rounded-lg border-l-2 px-2.5 py-1.5 text-left text-xs transition-all duration-200 ease-premium hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua ${
        isOwn ? 'border-white/40 bg-white/10' : 'border-neon-aqua bg-neon-aqua/10'
      }`}
    >
      <p className={`font-semibold ${isOwn ? 'text-white' : 'text-neon-aqua-bright'}`}>{senderLabel}</p>
      <p className={`truncate ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>{summary}</p>
    </button>
  );
}

// PHASE 11 — lightweight inline delete confirmation (Section 25). No modal —
// swaps the action-icon row for a tiny Cancel/Delete chip.
function DeleteConfirm({ onConfirm, onCancel }) {
  return (
    <div
      role="group"
      aria-label="Confirm delete message"
      className="flex animate-fade-in items-center gap-1.5 rounded-full border border-neon-fuchsia/30 bg-cyberslate px-2 py-1 text-[11px] shadow-glow-fuchsia"
    >
      <span className="hidden text-gray-400 sm:inline">Delete this message?</span>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel delete"
        className="rounded-full px-2 py-0.5 font-medium text-gray-400 transition-colors duration-200 hover:bg-cyberslate-light hover:text-white"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        aria-label="Confirm delete message"
        className="rounded-full bg-neon-fuchsia/15 px-2 py-0.5 font-semibold text-neon-fuchsia-bright transition-colors duration-200 hover:bg-neon-fuchsia/25"
      >
        Delete
      </button>
    </div>
  );
}

export default function MessageBubble({
  message, isOwn, currentUserId, otherUserName,
  onReact, onReply, onJumpToReply, onEdit, onDelete,
  onPin,
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // PHASE 11 — deleted messages render as a neutral placeholder only.
  // No content, no attachment, no reply preview, no reactions, no actions —
  // there's nothing left to react to, reply to, edit, or re-delete (Section 14/15/19).
  if (message.isDeleted) {
    return (
      <div className={`flex animate-fade-in-up flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm italic shadow-sm ${
            isOwn
              ? 'rounded-br-sm bg-cyberslate text-gray-500'
              : 'rounded-bl-sm border border-cyberslate-light bg-obsidian-light text-gray-500'
          }`}
        >
          <p>This message was deleted</p>
          <p className="mt-1 text-[10px] text-gray-600">{formatMessageTime(message.createdAt)}</p>
        </div>
      </div>
    );
  }

  const hasAttachment = !!message.attachment;
  const isImage = message.messageType === 'image' && hasAttachment;
  const isFile = message.messageType === 'file' && hasAttachment;
  const caption = message.content?.trim();
  const reactions = message.reactions || [];
  const myReaction = reactions.find((r) => r.userId === currentUserId?.toString())?.emoji || null;

  const handleSelect = (emoji) => onReact?.(message.id, emoji);
  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    onDelete?.(message.id);
  };

  return (
    <div className={`flex animate-fade-in-up flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-end gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm transition-shadow duration-300 ease-premium hover:shadow-md ${
            isOwn
              ? 'rounded-br-sm bg-gradient-to-r from-neon-aqua to-neon-aqua-bright text-white hover:shadow-glow-aqua'
              : 'rounded-bl-sm border border-cyberslate-light bg-cyberslate text-gray-100'
          }`}
        >
          {message.replyTo && (
            <ReplyPreview
              replyTo={message.replyTo}
              isOwn={isOwn}
              otherUserName={otherUserName}
              currentUserId={currentUserId}
              onJump={onJumpToReply}
            />
          )}

          {isImage && (
            <div className={caption ? 'mb-1.5' : ''}>
              <ImageAttachment attachment={message.attachment} caption={caption} onOpen={() => setLightboxOpen(true)} />
            </div>
          )}

          {isFile && (
            <div className={caption ? 'mb-1.5' : ''}>
              <FileAttachment attachment={message.attachment} isOwn={isOwn} />
            </div>
          )}

          {caption && <p className="whitespace-pre-wrap break-words">{caption}</p>}

          <p
            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
              isOwn ? 'text-white/80' : 'text-gray-500'
            }`}
          >
            {message.isPinned && (
              <span title="Pinned message" role="img" aria-label="Pinned message">
                <Pin className={`h-3 w-3 ${isOwn ? 'text-white/80' : 'text-neon-fuchsia-bright'}`} />
              </span>
            )}
            {message.editedAt && (
              <span title={formatMessageTime(message.editedAt)} className="italic">
                edited
              </span>
            )}
            {formatMessageTime(message.createdAt)}
            {isOwn && <StatusTicks status={message.status || 'sent'} />}
          </p>
        </div>

        {confirmDelete ? (
          <DeleteConfirm onConfirm={handleConfirmDelete} onCancel={() => setConfirmDelete(false)} />
        ) : (
          <div className={`flex items-center gap-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            {onReact && (
              <ReactionPicker currentEmoji={myReaction} align={isOwn ? 'right' : 'left'} onSelect={handleSelect} />
            )}

            {onReply && (
              <button
                type="button"
                onClick={() => onReply(message)}
                aria-label="Reply to message"
                className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 opacity-70 transition-all duration-200 ease-premium hover:scale-110 hover:bg-cyberslate hover:text-neon-aqua-bright hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua"
              >
                <ReplyIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {onPin && (
              <button
                type="button"
                onClick={() => onPin(message.id, message.isPinned)}
                aria-label={message.isPinned ? 'Unpin message' : 'Pin message'}
                className={`flex h-6 w-6 items-center justify-center rounded-full opacity-70 transition-all duration-200 ease-premium hover:scale-110 hover:bg-cyberslate hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua ${
                  message.isPinned ? 'text-neon-fuchsia-bright' : 'text-gray-500'
                }`}
              >
                {message.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            )}

            {isOwn && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(message)}
                aria-label="Edit message"
                className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 opacity-70 transition-all duration-200 ease-premium hover:scale-110 hover:bg-cyberslate hover:text-neon-aqua-bright hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}

            {isOwn && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete message"
                className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 opacity-70 transition-all duration-200 ease-premium hover:scale-110 hover:bg-neon-fuchsia/15 hover:text-neon-fuchsia-bright hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-aqua"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {onReact && (
        <MessageReactions reactions={reactions} currentUserId={currentUserId} isOwn={isOwn} onSelect={handleSelect} />
      )}

      {isImage && lightboxOpen && (
        <Lightbox url={message.attachment.url} alt={caption} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  );
}