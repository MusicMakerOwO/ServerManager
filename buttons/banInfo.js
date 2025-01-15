module.exports = {
	customID: 'ban-info',
	execute: async function(interaction, client) {

		const banData = client.db.prepare(`
			SELECT *
			FROM infractions
			WHERE userID = ?
			AND type = 'ban'
		`).get(interaction.user.id);
		if (!banData) return interaction.reply({ content: '🚩 You are not currently banned, please DM modmail if you cannot view the server', ephemeral: true });

		const embed = {
			color: 0xff0000,
			title: 'Ban Information',
			description: `
**Case ID**: ${banData.infractionID}
**Can Appeal**: ${banData.can_appeal ? '✅' : '❌'}
**Reason**: ${banData.reason}`
		}

		await interaction.reply({ embeds: [embed], ephemeral: true });
	}
}