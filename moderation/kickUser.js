module.exports = async function(client, guildID, userID, reason = 'No reason provided') {
	const guild = client.guilds.cache.get(guildID);
	if (!guild) throw new Error(`Unknown guildID : ${guildID}`);
	try {
		client.auditListener.silenceEvent('guildMemberRemove');
		const member = guild.members.cache.get(userID) ?? await guild.members.fetch(userID).catch(() => null);
		if (!member) return;
		await member.kick(reason);
	} catch (error) {
		throw new Error(`Failed to kick user : ${error}`);
	}
}