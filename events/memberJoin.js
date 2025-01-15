module.exports = {
	name: 'guildMemberAdd',
	execute: async function(client, member) {

		const banData = client.db.prepare(`
			SELECT *
			FROM infractions
			WHERE userID = ?
			AND type = 'ban'
		`).get(member.user.id);
		if (!banData) return;

		await new Promise(resolve => setTimeout(resolve, 1000));

		await client.editRoles(member.guild.id, member.id, [client.config.BANNED_ROLE_ID]);
	}
}
