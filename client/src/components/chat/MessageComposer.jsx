// src/components/chat/MessageComposer.jsx
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Paperclip, X, FileText, Reply as ReplyIcon, Pencil, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../../context/useSocket';
import { useTypingEmitter } from '../../hooks/useTypingEmitter';
import { validateAttachmentFile, humanFileSize, fileExtensionLabel, ACCEPT_ATTR } from '../../utils/attachmentPolicy';

const MAX_LENGTH = 2000;

// replyTo shape: { id, senderLabel, summary }
// editingMessage shape: the full message object being edited (id, content, attachment, ...)
export default function MessageComposer({
  onSend,
  onUpdate,
  disabled,
  conversationId,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}) {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { socket } = useSocket();
  const { notifyTyping, stopTyping } = useTypingEmitter(socket, conversationId);

  const isEditing = !!editingMessage;

  // Revoke the object URL on change/unmount so we don't leak memory over a long session.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Entering reply mode should put the cursor straight into the input (Section 10/26).
  useEffect(() => {
    if (replyTo && !isEditing) textareaRef.current?.focus();
  }, [replyTo, isEditing]);

  // PHASE 11 — entering edit mode: load the message's current text into the
  // existing composer (Section 23), drop any in-progress attachment draft
  // (attachment editing isn't supported this phase), and focus with the
  // cursor at the end.
  useEffect(() => {
    if (!editingMessage) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setValue(editingMessage.content || '');

    const el = textareaRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMessage?.id]);

  const handleChange = (e) => {
    const next = e.target.value.slice(0, MAX_LENGTH);
    setValue(next);

    if (isEditing) return; // don't fire typing events while editing an old message

    if (next.trim().length > 0) {
      notifyTyping();
    } else {
      stopTyping();
    }
  };

  const clearAttachment = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    const result = validateAttachmentFile(file);
    if (!result.valid) {
      toast.error(result.error);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setAttachedFile(file);
    setPreviewUrl(result.category === 'image' ? URL.createObjectURL(file) : null);
  };

  // PHASE 11 — Cancel edit: exit edit mode, clear the composer back to
  // empty (the text only existed because we loaded it for editing), never
  // touch the server (Section 24).
  const handleCancelEdit = () => {
    setValue('');
    onCancelEdit?.();
  };

  const handlePrimaryAction = async () => {
    if (isEditing) {
      const trimmed = value.trim();
      if (sending || disabled) return;
      // Mirrors backend Section 9 — text-only messages can't go empty;
      // an attachment message may have its caption cleared.
      if (!trimmed && !editingMessage.attachment) return;

      setSending(true);
      try {
        await onUpdate(editingMessage.id, trimmed);
        setValue('');
        onCancelEdit?.();
      } catch {
        // Parent already toasted; keep the edited text so the user can retry.
      } finally {
        setSending(false);
      }
      return;
    }

    const trimmed = value.trim();
    if ((!trimmed && !attachedFile) || sending || disabled) return;

    stopTyping();
    setSending(true);
    setUploadProgress(0);

    try {
      await onSend(trimmed, attachedFile, attachedFile ? setUploadProgress : undefined, replyTo?.id);
      setValue('');
      clearAttachment();
      onCancelReply?.(); // reply mode ends once the reply is actually sent
    } catch {
      // Parent already toasted the error; keep the draft/attachment/reply target so the user can retry.
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePrimaryAction();
    } else if (e.key === 'Escape' && isEditing) {
      handleCancelEdit();
    }
  };

  const canSend = isEditing
    ? (value.trim() || editingMessage.attachment) && !sending && !disabled
    : (value.trim() || attachedFile) && !sending && !disabled;

  return (
    <div className="border-t border-neon-aqua/10 bg-obsidian/90 p-3 backdrop-blur-md">
      {isEditing && (
        <div className="mb-2 flex animate-fade-in-up items-center gap-2 rounded-xl border border-neon-fuchsia/30 bg-neon-fuchsia/10 p-2">
          <Pencil className="h-4 w-4 shrink-0 text-neon-fuchsia-bright" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-neon-fuchsia-bright">
            Editing message
          </p>
          <button
            type="button"
            onClick={handleCancelEdit}
            aria-label="Cancel edit"
            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors duration-200 hover:bg-cyberslate-light hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isEditing && replyTo && (
        <div className="mb-2 flex animate-fade-in-up items-center gap-2 rounded-xl border border-neon-aqua/30 bg-neon-aqua/10 p-2">
          <ReplyIcon className="h-4 w-4 shrink-0 text-neon-aqua-bright" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-neon-aqua-bright">
              Replying to {replyTo.senderLabel}
            </p>
            <p className="truncate text-xs text-gray-400">{replyTo.summary}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors duration-200 hover:bg-cyberslate-light hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isEditing && attachedFile && (
        <div className="mb-2 flex animate-fade-in-up items-center gap-2 rounded-xl border border-cyberslate-light bg-cyberslate p-2">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected attachment preview"
              className="h-12 w-12 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neon-aqua/15">
              <FileText className="h-5 w-5 text-neon-aqua-bright" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-100">
              {attachedFile.name}
            </p>
            <p className="text-[11px] text-gray-500">
              {sending
                ? `Uploading... ${uploadProgress}%`
                : `${fileExtensionLabel(attachedFile.name)} • ${humanFileSize(attachedFile.size)}`}
            </p>
            {sending && (
              <div
                className="mt-1 h-1 w-full overflow-hidden rounded-full bg-obsidian-light"
                role="progressbar"
                aria-valuenow={uploadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-neon-aqua to-neon-fuchsia shadow-glow-aqua transition-all duration-300 ease-premium"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {!sending && (
            <button
              onClick={clearAttachment}
              aria-label="Remove attachment"
              className="shrink-0 rounded-full p-1 text-gray-400 transition-colors duration-200 hover:bg-cyberslate-light hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        {!isEditing && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={handleFileChange}
              disabled={disabled || sending}
              className="hidden"
              tabIndex={-1}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || sending}
              aria-label="Attach an image or file"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyberslate-light text-gray-400 transition-all duration-200 ease-premium hover:scale-105 hover:border-neon-aqua/40 hover:bg-cyberslate hover:text-neon-aqua-bright disabled:opacity-50"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isEditing
              ? 'Edit your message...'
              : attachedFile
              ? 'Add a caption (optional)...'
              : replyTo
              ? 'Type your reply...'
              : 'Type a message...'
          }
          rows={1}
          disabled={disabled}
          aria-label={isEditing ? 'Edit message' : 'Message'}
          className="max-h-32 flex-1 resize-none rounded-xl border border-cyberslate-light bg-cyberslate px-4 py-2.5 text-sm text-white outline-none transition-all duration-200 ease-premium placeholder:text-gray-500 focus:border-neon-aqua focus:shadow-glow-aqua disabled:opacity-60"
        />

        <button
          onClick={handlePrimaryAction}
          disabled={!canSend}
          aria-label={isEditing ? 'Save edit' : 'Send message'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-neon-aqua to-neon-fuchsia text-white shadow-glow-aqua transition-all duration-200 ease-premium hover:scale-105 hover:shadow-glow-fuchsia-lg disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-glow-aqua"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditing ? (
            <Check className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}