const ResetToken = require('../ResetOwnToken.js');

const AUDIT_LOG_TYPES = {
	'GUILD_UPDATE': 1,
	'CHANNEL_CREATE': 10,
	'CHANNEL_UPDATE': 11,
	'CHANNEL_DELETE': 12,
	'CHANNEL_OVERWRITE_CREATE': 13,
	'CHANNEL_OVERWRITE_UPDATE': 14,
	'CHANNEL_OVERWRITE_DELETE': 15,
	'MEMBER_KICK': 20,
	'MEMBER_PRUNE': 21,
	'MEMBER_BAN_ADD': 22,
	'MEMBER_BAN_REMOVE': 23,
	'MEMBER_UPDATE': 24,
	'MEMBER_ROLE_UPDATE': 25,
	'MEMBER_MOVE': 26,
	'MEMBER_DISCONNECT': 27,
	'BOT_ADD': 28,
	'ROLE_CREATE': 30,
	'ROLE_UPDATE': 31,
	'ROLE_DELETE': 32,
	'INVITE_CREATE': 40,
	'INVITE_UPDATE': 41,
	'INVITE_DELETE': 42,
	'WEBHOOK_CREATE': 50,
	'WEBHOOK_UPDATE': 51,
	'WEBHOOK_DELETE': 52,
	'EMOJI_CREATE': 60,
	'EMOJI_UPDATE': 61,
	'EMOJI_DELETE': 62,
	'MESSAGE_DELETE': 72,
	'MESSAGE_BULK_DELETE': 73,
	'MESSAGE_PIN': 74,
	'MESSAGE_UNPIN': 75,
	'INTEGRATION_CREATE': 80,
	'INTEGRATION_UPDATE': 81,
	'INTEGRATION_DELETE': 82,
	'STAGE_INSTANCE_CREATE': 83,
	'STAGE_INSTANCE_UPDATE': 84,
	'STAGE_INSTANCE_DELETE': 85,
	'STICKER_CREATE': 90,
	'STICKER_UPDATE': 91,
	'STICKER_DELETE': 92,
	'GUILD_SCHEDULED_EVENT_CREATE': 100,
	'GUILD_SCHEDULED_EVENT_UPDATE': 101,
	'GUILD_SCHEDULED_EVENT_DELETE': 102,
	'THREAD_CREATE': 110,
	'THREAD_UPDATE': 111,
	'THREAD_DELETE': 112,
	'APPLICATION_COMMAND_PERMISSION_UPDATE': 121,
	'AUTO_MODERATION_RULE_CREATE': 140,
	'AUTO_MODERATION_RULE_UPDATE': 141,
	'AUTO_MODERATION_RULE_DELETE': 142,
	'AUTO_MODERATION_BLOCK_MESSAGE': 143,
	'AUTO_MODERATION_FLAG_TO_CHANNEL': 144,
	'AUTO_MODERATION_USER_COMMUNICATION_DISABLED': 145,
	'CREATOR_MONETIZATION_REQUEST_CREATED': 150,
	'CREATOR_MONETIZATION_TERMS_ACCEPTED': 151,
	'ONBOARDING_PROMPT_CREATE': 163,
	'ONBOARDING_PROMPT_UPDATE': 164,
	'ONBOARDING_PROMPT_DELETE': 165,
	'ONBOARDING_CREATE': 166,
	'ONBOARDING_UPDATE': 167
}

const VALID_EVENTS = [
	'guildMemberRemove',
	'guildMemberUpdate',
	'guildMemberBan',
	'channelCreate',
	'channelDelete',
	'channelUpdate',
	'roleCreate',
	'roleDelete',
	'roleUpdate',
	'guildUpdate',
	'messageDelete',
	'messageBulkDelete',
]

module.exports = class AuditListener {

	#client = {};
	#activeEvents = new Map();
	constructor(client) {
		this.#client = client;
		this.#initListeners();
	}

	async #fetchLastAuditLog(type) {
		const guild = this.#client.guilds.cache.get("970775928596746290");
		if (!guild) return;
		const auditLogs = await guild.fetchAuditLogs({ limit: 1 });
		const lastAuditLog = auditLogs.entries.first();
		if (!lastAuditLog) return null;
		if (lastAuditLog.action !== type) return null;
		if (lastAuditLog.executor?.id !== this.#client.user.id) return null;
		return lastAuditLog;
	}

	listActiveEvents() {
		return Array.from(this.#activeEvents.values());
	}

	eventIsActive(event) {
		if (!this.isValidEvent(event)) throw new Error(`Invalid event : ${event}`);
		return this.listActiveEvents().includes(event);
	}

	isValidEvent(event) {
		return VALID_EVENTS.includes(event);
	}

	async #EventCallback(eventName, auditType, notificationMessage) {
		const lastAuditLog = await this.#fetchLastAuditLog(auditType);
		if (!lastAuditLog) return;
		if (this.eventIsActive(eventName)) return;
		// await this.#NotifyStaff(notificationMessage);
		this.#client.destroy();
		// await ResetToken();
		process.exitCode = 1;
	}


	#initListeners() {
		this.#client.on('guildMemberRemove', async (member) => {
			this.#EventCallback('guildMemberRemove', AUDIT_LOG_TYPES.MEMBER_KICK, `I have been compromised and kicked a user : ${member.user.username} (${member.user.id})`);
		});
		this.#client.on('guildBanAdd', async (member) => {
			this.#EventCallback('guildBanAdd', AUDIT_LOG_TYPES.MEMBER_BAN_ADD, `I have been compromised and banned a user : ${member.user.username} (${member.user.id})`);
		});
		this.#client.on('guildMemberUpdate', async (_, newMember) => {
			this.#EventCallback('guildMemberUpdate', AUDIT_LOG_TYPES.MEMBER_UPDATE, `I have been compromised and updated a user : ${newMember.user.username} (${newMember.user.id})`);
		});
		this.#client.on('channelCreate', async (channel) => {
			this.#EventCallback('channelCreate', AUDIT_LOG_TYPES.CHANNEL_CREATE, `I have been compromised and created a channel : ${channel.name} (${channel.id})`);
		});
		this.#client.on('channelDelete', async (channel) => {
			this.#EventCallback('channelDelete', AUDIT_LOG_TYPES.CHANNEL_DELETE, `I have been compromised and deleted a channel : ${channel.name} (${channel.id})`);
		});
		this.#client.on('channelUpdate', async (_, newChannel) => {
			this.#EventCallback('channelUpdate', AUDIT_LOG_TYPES.CHANNEL_UPDATE, `I have been compromised and updated a channel : ${newChannel.name} (${newChannel.id})`);
		});
		this.#client.on('channelUpdate', async (_, newChannel) => {
			this.#EventCallback('channelUpdate', AUDIT_LOG_TYPES.CHANNEL_OVERWRITE_UPDATE, `I have been compromised and updated a channel : ${newChannel.name} (${newChannel.id})`);
		});
		this.#client.on('channelUpdate', async (_, newChannel) => {
			this.#EventCallback('channelUpdate', AUDIT_LOG_TYPES.CHANNEL_OVERWRITE_DELETE, `I have been compromised and updated a channel : ${newChannel.name} (${newChannel.id})`);
		});
		this.#client.on('roleCreate', async (role) => {
			this.#EventCallback('roleCreate', AUDIT_LOG_TYPES.ROLE_CREATE, `I have been compromised and created a role : ${role.name} (${role.id})`);
		});
		this.#client.on('roleDelete', async (role) => {
			this.#EventCallback('roleDelete', AUDIT_LOG_TYPES.ROLE_DELETE, `I have been compromised and deleted a role : ${role.name} (${role.id})`);
		});
		this.#client.on('roleUpdate', async (_, newRole) => {
			this.#EventCallback('roleUpdate', AUDIT_LOG_TYPES.ROLE_UPDATE, `I have been compromised and updated a role : ${newRole.name} (${newRole.id})`);
		});
		this.#client.on('guildUpdate', async () => {
			this.#EventCallback('guildUpdate', AUDIT_LOG_TYPES.GUILD_UPDATE, `I have been compromised and updated the guild`);
		});
		this.#client.on('messageDelete', async (message) => {
			this.#EventCallback('messageDelete', AUDIT_LOG_TYPES.MESSAGE_DELETE, `I have been compromised and deleted a message : ${message.content}`);
		});
		this.#client.on('messageBulkDelete', async (messages) => {
			this.#EventCallback('messageBulkDelete', AUDIT_LOG_TYPES.MESSAGE_BULK_DELETE, `I have been compromised and bulk deleted messages`);
		})
		this.#client.on('tokenReset', async (user) => {
			await this.#NotifyStaff(`${user.username} (${user.id}) has reset my token`);
			this.#client.destroy();
			await ResetToken();
			process.exitCode = 1;
		});
	}

	async #NotifyStaff(message) {
		const guild = this.#client.guilds.cache.get("970775928596746290");
		const adminRole = guild.roles.cache.get("1198108552238202880");
		const msgEmbed = {
			color: 0xFF0000,
			title: "Critical Activity",
			description: message,
			timestamp: new Date()
		}
		for (const admin of adminRole.members) {
			try {
				await admin.send({ embeds: [msgEmbed] });
			} catch (error) {
				console.error(error);
			}
		}
	}

	silenceEvent(event, duration = 1000 * 10) {
		if (!this.isValidEvent(event)) throw new Error(`Invalid event : ${event}`);
		const salt = Math.random().toString(36).substring(7);
		this.#activeEvents.set(salt, event);
		setTimeout(this.#activeEvents.delete.bind(this.#activeEvents, salt), duration);
	}
}
