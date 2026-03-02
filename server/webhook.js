const { execFile } = require('child_process');

const OPENCLAW_BIN = '/home/sebastian/.npm-global/bin/openclaw';
const SESSION_ID = '8d13fbf6-fbc2-45bb-a109-718ea07037d1';

function notifyOpenClaw(text) {
  execFile(OPENCLAW_BIN, ['system', 'event', '--text', text, '--mode', 'now'], (err) => {
    if (err) console.error('Webhook notify failed:', err.message);
    else console.log('Webhook notified:', text);
  });
}

function chatToOpenClaw(author, location, message) {
  const text = `[CLAWCOM Chat] ${author} on ${location}: ${message}`;
  execFile(OPENCLAW_BIN, [
    'agent',
    '--session-id', SESSION_ID,
    '--message', text,
    '--channel', 'discord',
    '--deliver'
  ], (err, stdout, stderr) => {
    if (err) {
      console.error('Chat agent message failed:', err.message);
      // Fallback to system event
      notifyOpenClaw(`MC-CHAT: ${author} on ${location}: ${message}`);
    } else {
      console.log('Chat routed to agent session');
    }
  });
}

module.exports = { notifyOpenClaw, chatToOpenClaw };
