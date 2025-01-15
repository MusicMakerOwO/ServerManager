const crypto = require('crypto');
const { TOTP_SECRET } = require('./config.json');

function generateTOTP(secret, timeStep = 30, digits = 6) {
    const key = Buffer.from(secret, 'base64');
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);

    const buffer = Buffer.alloc(8);
    buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    buffer.writeUInt32BE(counter % 0x100000000, 4);

    const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % Math.pow(10, digits);

    return code.toString()
}

module.exports = generateTOTP.bind(null, TOTP_SECRET);