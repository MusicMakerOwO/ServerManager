module.exports = async function (client, guildID, userID, roleIDs = []) {
	const guild = client.guilds.cache.get(guildID);
	if (!guild) return 'Guild not found';

	const member = await guild.members.cache.get(userID) ?? await guild.members.fetch(userID).catch(() => null);
	if (!member) throw 'Member not found';

	if (!Array.isArray(roleIDs) || roleIDs.some(roleID => typeof roleID !== 'string')) throw 'Invalid role IDs - Must be an array of strings';

	try {
		client.auditListener.silenceEvent('guildMemberUpdate');
		await member.roles.set(roleIDs);
	} catch (error) {
		throw new Error(`Failed to edit roles : ${error}`);
	}
}