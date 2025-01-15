module.exports = {
	customID: 'appeal',
	execute: async function(interaction, client) {

		await interaction.deferReply({ ephemeral: true });

		const embed = {
			color: 0xff0000,
			description: ''
		};

		const banData = client.db.prepare(`
			SELECT *
			FROM infractions
			WHERE userID = ?
			AND type = 'ban'
		`).get(interaction.user.id);
		if (!banData) {
			embed.description = '🚩 You are not currently banned, please DM ModMail if you cannot view the server';
			return interaction.editReply({ embeds: [embed] });
		}

		if (!banData.can_appeal) {
			embed.description = '🚩 You are not allowed to appeal this ban';
			return interaction.editReply({ embeds: [embed] });
		}

		const appealData = client.db.prepare(`
			SELECT *
			FROM infraction_appeals
			WHERE infractionID = ?
			AND status = 'pending'
		`).get(banData.infractionID);
		if (appealData && appealData.status === 'pending' && Date.parse(appealData.expires_at) > Date.now()) {
			embed.description = '🚩 You already have an appeal pending';
			return interaction.editReply({ embeds: [embed] });
		}

		const timeRemaining = Date.parse(banData.expires_at) - Date.now();
		if (timeRemaining > 0) {
			const remainingDays = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
			embed.description = `🚩 You cannot appeal again for \`${remainingDays}\` days`;
			return interaction.editReply({ embeds: [embed] });
		}

		const infractionID = client.db.prepare(`
			SELECT MAX(infractionID)
			FROM infractions
		`).pluck().get();

		client.cache.set(`appeal-${interaction.user.id}`, {
			infractionID: infractionID,
			guildID: interaction.guild.id,
			userID: interaction.user.id,
			questions: [
				{
					question: 'Why do you think you should be unbanned?',
					answer: '',
					shortText: 'Unban reason',
					emoji: '📝'
				},
				{
					question: 'What is your side of the story?',
					answer: '',
					shortText: 'Story',
					emoji: '📖'
				},
				{
					question: 'What will you do to prevent this from happening again?',
					answer: '',
					shortText: 'Prevention',
					emoji: '🔒'
				}
			]
		});

		const button = client.buttons.get('appealForm');
		return await button.execute(interaction, client, ['view']);
	}
}
