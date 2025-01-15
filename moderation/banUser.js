module.exports = async function(client, guildID, userID, reason = 'No reason provided') {
	const guild = client.guilds.cache.get(guildID);
	if (!guild) throw new Error(`Unknown guildID : ${guildID}`);
	try {
		client.auditListener.silenceEvent('guildMemberBan');
		await guild.bans.create(userID, { reason: reason, deleteMessageSeconds: 0 });
	} catch (error) {
		throw new Error(`Failed to ban user : ${error}`);
	}
}