// 🤖 BotID runs a small invisible check in the browser for these routes.
// Not /api/quick or /api/share: the iPhone Shortcut calls those without a browser.
import { initBotId } from 'botid/client/core';

initBotId({
  protect: [
    { path: '/api/check', method: 'POST' },
    { path: '/api/photo', method: 'POST' },
    { path: '/api/ask', method: 'POST' },
    { path: '/api/feedback', method: 'POST' },
  ],
});
