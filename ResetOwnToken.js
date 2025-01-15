const fs = require("node:fs");
const https = require("node:https");
const totp = require("./totp.js");

const { OWNER_TOKEN } = require("./config.json");

const CLIENT_ID = "1248114558166630490";

function MakeRequest(method, url, body = null, headers = {}) {
	return new Promise((resolve, reject) => {
		Object.assign(headers, {
			'Authorization': OWNER_TOKEN,
			'Content-Type': 'application/json'
		});
		const req = https.request(url, { method, headers }, res => {
			let data = [];
			res.on('data', data.push.bind(data));
			res.on('end', () => resolve(JSON.parse(data.join(''))));
		});

		req.on('error', reject);
		if (body) req.write(JSON.stringify(body));
		req.end();
	});
}

module.exports = async function () {

	const mfaOptions = await MakeRequest("POST", `https://discord.com/api/v9/applications/${CLIENT_ID}/bot/reset`); // We need the ticket from this request
	
	const ticket = mfaOptions?.mfa?.ticket;
	if (!ticket || mfaOptions.code !== 60003) {
		console.error(mfaOptions);
		console.error( new Error("Something went wrong in the MFA process") );
	}

	const mfaCode = totp(); // your 6 digit code

	const mfaToken = await MakeRequest("POST", "https://discord.com/api/v9/mfa/finish", {
		data: mfaCode,
		ticket: ticket,
		mfa_type: 'totp' // 2FA code
	});
	
	const botToken = await MakeRequest("POST", `https://discord.com/api/v9/applications/${CLIENT_ID}/bot/reset`, null, {
		'X-Discord-MFA-Authorization': mfaToken.token
	});

	const configFile = fs.readFileSync(`${__dirname}/config.json`, 'utf-8');
	const config = JSON.parse(configFile);
	Object.assign(config, { TOKEN: botToken.token });

	fs.writeFileSync(`${__dirname}/config.json`, JSON.stringify(config, null, 4));
};