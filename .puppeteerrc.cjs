/**
 * Puppeteer configuration
 * Skip bundled Chrome download — we use system Chromium in production (Railway/Docker)
 */
module.exports = {
  skipDownload: true,
};
