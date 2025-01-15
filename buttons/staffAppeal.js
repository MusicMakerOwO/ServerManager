module.exports = {
	customID: 'staff-appeal',
	execute: async function (interaction, client, [ appealID, action ] = ['1', 'null']) {
		const appealData = client.db.prepare(`
			SELECT *
			FROM infraction_appeals
			WHERE appealID = ?
		`).get(appealID);
		if (!appealData) {
			return interaction.reply({
				content: '🚩 This appeal does not exist',
				components: [],
				embeds: [],
				ephemeral: true
			});
		}

		await interaction.deferUpdate().catch(() => {});

		client.db.prepare(`
			UPDATE infraction_appeals
			SET status = ?
			WHERE appealID = ?
		`).run(action, appealID);

		const userID = client.db.prepare(`
			SELECT userID
			FROM infractions
			WHERE infractionID = ?
		`).pluck().get(appealData.infractionID);

		const userEmbed = {
			color: action === 'approved' ? 0x00ff00 : 0xff0000,
			title: 'Appeal Information',
			description: `
Your appeal for case ID \`${appealData.infractionID}\` has been \`${action}\`

**User ID**: ${userID}
**Infraction ID**: ${appealData.infractionID}
**Status**: ${action === 'approved' ? 'Approved' : 'Denied'}`,
			timestamp: new Date()
		};

		const member = interaction.guild.members.cache.get(userID) ?? await interaction.guild.members.fetch(userID).catch(() => null);
		if (member) {
			member.user.send({ embeds: [userEmbed] }).catch(() => {});

			if (action === 'approved') {
				client.db.prepare(`
					DELETE FROM infractions
					WHERE infractionID = ?
				`).run(appealData.infractionID);
				await client.editRoles(interaction.guild.id, userID, ["970775928617725978"]); // community role
			}
		}

		const currentEmbed = interaction.message.embeds[0].data;
		
		currentEmbed.description = `
**Status** : ${action === 'approved' ? 'Approved' : 'Denied'}
**Moderator** : ${interaction.user.username}
**Timestamp** : <t:${Math.floor(Date.now() / 1000)}:D>\n\n` + currentEmbed.description;

		currentEmbed.color = action === 'approved' ? 0x00ff00 : 0xff0000;

		await interaction.editReply({
			embeds: [currentEmbed],
			components: []
		});

	}
}