/* LinguaBomb config. The ntfy topic is a secret-ish id: it lives ONLY here. */
window.LINGUA_CONFIG = {
  NTFY_TOPIC: 'linguabomb-bi-9xk2q7m4v8t1c6zp',
  NTFY_BASE: 'https://ntfy.sh',
  SINCE: '6h'
};
if (typeof module !== 'undefined' && module.exports) module.exports = window.LINGUA_CONFIG;
