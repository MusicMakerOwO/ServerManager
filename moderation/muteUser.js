module.exports = async function(client, guildID, userID, duration) {
	const guild = client.guilds.cache.get(guildID);
	if (!guild) throw new Error(`Unknown guildID : ${guildID}`);
	try {
		client.auditListener.silenceEvent('guildMemberUpdate');
		const member = guild.members.cache.get(userID) ?? await guild.members.fetch(userID).catch(() => null);
		if (!member) return;
		await member.timeout(duration);
	} catch (error) {
		throw new Error(`Failed to mute user : ${error}`);
	}
}