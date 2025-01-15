'use strict';
require('./utils/SetupDB.js')();

console.log('='.repeat(50));
console.log('Database setup complete - Loading bot...');

const fs = require('node:fs');

const db = require('better-sqlite3')(`${__dirname}/serverManager.sqlite`);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('temp_store = MEMORY');
db.pragma('page_size = 4096');
db.pragma('auto_vacuum = FULL');
db.pragma('analysis_limit = 4000');

require('./utils/ProcessHandlers.js')(db);

const { Client, PermissionsBitField: { Flags: Permissions } } = require('discord.js');

const client = new Client({
    intents: [
        'Guilds',
        'GuildMembers',
        'GuildMessages',
		'GuildBans'
    ]
});

const AuditListener = require('./utils/AuditListener.js');

client.config = require('./config.json');
client.logs = require('./utils/Logs.js');
client.cooldowns = new Map();
client.cache = new Map();
client.db = db;
client.auditListener = new AuditListener(client);

const moderationFiles = fs.readdirSync(`${__dirname}/moderation`).filter(file => file.endsWith('.js'));
for (const file of moderationFiles) {
	const command = require(`./moderation/${file}`);
	client[file.replace('.js', '')] = command.bind(null, client);
}

require('./utils/ComponentLoader.js')(client);
require('./utils/EventLoader.js')(client);
require('./utils/RegisterCommands.js')(client);

client.on('rateLimit', function (rateLimitInfo) {
    client.logs.warn(`Rate limited: ${rateLimitInfo.method} ${rateLimitInfo.path} ${rateLimitInfo.route}`);
});

client.logs.info(`Logging in...`);
client.login(client.config.TOKEN);
client.on('ready', function () {
    client.logs.success(`Logged in as ${client.user.tag}!`);

	require('./utils/CheckIntents.js')(client);
});


function CheckGuildAccess(requiredGuilds, guildID) {
	if (Array.isArray(requiredGuilds) && !requiredGuilds.includes(guildID)) {
		throw ['You don\'t have permission to use this command!', 'Guild not whitelisted'];
	}
}

function CheckUserAccess(requiredRoles, userIDs, member, user) {
	if (member && requiredRoles) {
		const hasRole = requiredRoles.some(roleID => member._roles.includes(roleID));
		if (!hasRole && !member.permissions.has('Administrator')) {
			throw ['You don\'t have permission to use this command!', 'Missing roles'];
		}
	}

	if (Array.isArray(userIDs) && !userIDs.includes(user.id)) {
		throw ['You don\'t have permission to use this command!', 'User not whitelisted'];
	}
}

function CheckPermissions(permissionsArray, member) {
	if (!Array.isArray(permissionsArray) || !member) return;

	const prefix = member.user.id === client.id ? 'I am' : 'You are';

	const missingPermissions = [];
	if (permissionsArray.length === 0) return;
	for (const permission of permissionsArray) {
		if (member.permissions.has(Permissions[permission])) continue;
		missingPermissions.push(permission);
	}

	if (missingPermissions.length > 0) {
		throw [`${prefix} missing the following permissions: \`${missingPermissions.join('`, `')}\``, 'Missing permissions'];
	}
}

function CheckCooldown(userID, command, cooldown) {
	const timeRemaining = client.cooldowns.get(`${userID}-${command}`) ?? 0;
	const remaining = (timeRemaining - Date.now()) / 1000;
	if (remaining > 0) {
		throw [`Please wait ${remaining.toFixed(1)} more seconds before reusing the \`${command}\` command!`, 'On cooldown'];
	}
	client.cooldowns.set(`${userID}-${command}`, Date.now() + cooldown * 1000);
}

async function InteractionHandler(interaction, type) {

	const args = interaction.customId?.split("_") ?? [];
	const name = args.shift();

	const component = client[type].get(name ?? interaction.commandName);
	if (!component) {
		await interaction.reply({
			content: `There was an error while executing this command!\n\`\`\`Command not found\`\`\``,
			ephemeral: true
		}).catch(() => { });
		client.logs.error(`${type} not found: ${interaction.customId}`);
		return;
	}

	try {
		CheckGuildAccess(component.guilds, interaction.guildId);
		CheckUserAccess(component.roles, component.users, interaction.member, interaction.user);
		CheckCooldown(interaction.user.id, component.customID ?? interaction.commandName, component.cooldown);

		const botMember = interaction.guild?.members.cache.get(client.user.id) ?? await interaction.guild?.members.fetch(client.user.id).catch(() => null);
		if (botMember !== null) {
			// This code will only trigger if
			// 1) Bot is in the guild (always will)
			// 2) Command not being run in DMs
			// 3) Client has GuildMembers intent
			// 4) Not actively rate limited
			CheckPermissions(component.clientPerms, botMember); // bot
			CheckPermissions(component.userPerms, interaction.member); // user
		}
	} catch ([response, reason]) {
		await interaction.reply({
			content: response,
			ephemeral: true
		}).catch(() => { });
		client.logs.error(`Blocked user from ${type}: ${reason}`);
		return;
	}

	try {
		if (interaction.isAutocomplete()) {
			await component.autocomplete(interaction, client, type === 'commands' ? undefined : args);
		} else {
			await component.execute(interaction, client, type === 'commands' ? undefined : args);
		}
	} catch (error) {
		client.logs.error(error);
		await interaction.deferReply({ ephemeral: true }).catch(() => { });
		await interaction.editReply({
			content: `There was an error while executing this command!\n\`\`\`${error}\`\`\``,
			embeds: [],
			components: [],
			files: [],
			ephemeral: true
		}).catch(() => { });
	}
}

client.on('interactionCreate', async function (interaction) {
	if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

	const subcommand = interaction.options._subcommand ?? "";
	const subcommandGroup = interaction.options._subcommandGroup ?? "";
	const commandArgs = interaction.options._hoistedOptions ?? [];
	const args = `${subcommandGroup} ${subcommand} ${commandArgs.map(arg => arg.value).join(" ")}`.trim();
	client.logs.info(`${interaction.user.tag} (${interaction.user.id}) > /${interaction.commandName} ${args}`);

	await InteractionHandler(interaction, 'commands');
});


client.on('interactionCreate', async function (interaction) {
	if (!interaction.isButton()) return;
	client.logs.info(`${interaction.user.tag} (${interaction.user.id}) > [${interaction.customId}]`);
	await InteractionHandler(interaction, 'buttons');
});


client.on('interactionCreate', async function (interaction) {
	if (!interaction.isStringSelectMenu()) return;
	client.logs.info(`${interaction.user.tag} (${interaction.user.id}) > <${interaction.customId}>`);
	await InteractionHandler(interaction, 'menus');
});


client.on('interactionCreate', async function (interaction) {
	if (!interaction.isModalSubmit()) return;
	client.logs.info(`${interaction.user.tag} (${interaction.user.id}) > {${interaction.customId}}`);
	await InteractionHandler(interaction, 'modals');
});
