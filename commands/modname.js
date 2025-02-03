const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	roles: ['1198108657846583336'],
	data: new SlashCommandBuilder()
		.setName('modname')
		.setDescription('Reset a user\'s display name to their username.')
		.addUserOption(x => x
			.setName('user')
			.setDescription('The user to reset the display name of.')
			.setRequired(true)
		),
	async execute(interaction, client) {

		await interaction.deferReply().catch(() => {});

		const user = interaction.options.getUser('user');
		const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);

		if (!member) return await interaction.editReply({ content: `⚠️ I was not able to find this user!` });

		const embed = {
			color: 0x2196f3,
			description: '',
			timeStamp: new Date()
		}

		try {
			await client.nickname(interaction.guild.id, user.id, user.username);
			embed.description = `${client.config.YES_EMOJI} Successfully reset ${user}'s display name`;
		} catch (error) {
			embed.description = `${client.config.NO_EMOJI} Failed to reset ${user}'s display name`;
		}

		await interaction.editReply({ embeds: [embed] }).catch(() => {});
	}
}