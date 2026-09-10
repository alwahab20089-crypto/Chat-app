// Small, controlled set of supported reactions. Server is the source of
// truth for validation — never trust the client's emoji value.
const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '👏'];

module.exports = { ALLOWED_EMOJIS };