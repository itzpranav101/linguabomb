/* LinguaBomb config. The ntfy topic is a secret-ish id: it lives ONLY here. */
window.LINGUA_CONFIG = {
  NTFY_TOPIC: 'linguabomb-bi-79ac882c37b9f7f3e2201804',
  NTFY_BASE: 'https://ntfy.sh',
  SINCE: '2h'
};
if (typeof module !== 'undefined' && module.exports) module.exports = window.LINGUA_CONFIG;
