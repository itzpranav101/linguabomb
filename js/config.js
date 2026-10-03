/* LinguaBomb config. The ntfy topic is a secret-ish id: it lives ONLY here. */
window.LINGUA_CONFIG = {
  NTFY_TOPIC: 'linguabomb-bi-54826b9b6336b5af46a68bd8',
  NTFY_BASE: 'https://ntfy.sh',
  SINCE: '2h'
};
if (typeof module !== 'undefined' && module.exports) module.exports = window.LINGUA_CONFIG;
