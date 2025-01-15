module.exports = async function(client, guildID, userID, nickname) {
	const guild = client.guilds.cache.get(guildID);
	if (!guild) throw new Error(`Unknown guildID : ${guildID}`);
	try {
		client.auditListener.silenceEvent('guildMemberUpdate');
		const member = guild.members.cache.get(userID) ?? await guild.members.fetch(userID).catch(() => null);
		if (!member) throw new Error(`Unknown userID : ${userID}`);
		await member.setNickname(nickname);
	} catch (error) {
		throw new Error(`Failed to set nickname : ${error}`);
	}
}