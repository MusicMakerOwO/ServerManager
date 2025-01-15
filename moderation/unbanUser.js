module.exports = async function(client, guildID, userID) {
	const guild = client.guilds.cache.get(guildID);
	if (!guild) throw new Error(`Unknown guildID : ${guildID}`);
	try {
		client.auditListener.silenceEvent('guildBanRemove');
		await guild.bans.delete(userID);
		client.db.prepare(`
			DELETE FROM bans
			WHERE guildID = ? AND userID = ?
		`).run(guildID, userID);
	} catch (error) {
		throw new Error(`Failed to unban user : ${error}`);
	}
}