const https = require('https');
const User  = require('../models/User_v2');

function postToExpo(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(messages);
    const req  = https.request(
      {
        hostname: 'exp.host',
        path:     '/--/api/v2/push/send',
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
          Accept:           'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) return;
  try {
    await postToExpo([{ to: pushToken, title, body, data, sound: 'default' }]);
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

exports.notifyAdmins = async (title, body, data = {}) => {
  try {
    const admins = await User.find({ role: 'ADMIN', is_active: true }).select('+push_token');
    const tokens = admins.map(a => a.push_token).filter(t => t && t.startsWith('ExponentPushToken['));
    if (!tokens.length) return;
    const messages = tokens.map(to => ({ to, title, body, data, sound: 'default' }));
    await postToExpo(messages);
  } catch (err) {
    console.error('Notify admins error:', err.message);
  }
};
