const CHANNEL_TYPES = {
	guild_text: 0,
	dm: 1,
	guild_voice: 2,
	group_dm: 3,
	guild_category: 4,
	guild_announcement: 5,
	announcement_thread: 10,
	public_thread: 11,
	private_thread: 12,
	guild_stage_voice: 13,
	guild_directory: 14,
	guild_forum: 15,
	guild_media: 16
}

const CHANNEL_TYPES_TO_MODIFY = [
	CHANNEL_TYPES.guild_text,
	CHANNEL_TYPES.guild_voice,
	CHANNEL_TYPES.guild_category,
	CHANNEL_TYPES.guild_announcement,
	CHANNEL_TYPES.announcement_thread,
	CHANNEL_TYPES.guild_stage_voice,
	CHANNEL_TYPES.guild_forum,
	CHANNEL_TYPES.guild_media
]

module.exports = {
	name: 'channelCreate',
	execute: async function(client, channel) {
		if (!CHANNEL_TYPES_TO_MODIFY.includes(channel.type)) return;
		if (channel.permissionOverwrites.cache.has(client.config.BANNED_ROLE_ID)) return;

		try {
			await channel.permissionOverwrites.create(client.config.BANNED_ROLE_ID, {
				ViewChannel: false,
				SendMessages: false,
				AddReactions: false,
				Connect: false,
				Speak: false,
				Stream: false
			});
		} catch (error) {
			client.logs.error(`Failed to create channel permission overwrites: ${error}`);
		}
	}
}