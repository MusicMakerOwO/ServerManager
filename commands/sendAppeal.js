const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('sendappeal')
		.setDescription('Send the ban appeal message'),
	execute: async function(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		const embed = {
			description: `
**You have been banned from the server**
If you believe this was a mistake or would like to appeal the ban, please click the button below to get started. Please be patient as we review your appeal.
`,
			color: 0xff0000
		}

		const buttons = {
			type: 1,
			components: [
				{
					type: 2,
					style: 4,
					custom_id: 'appeal',
					label: 'Appeal Ban'
				},
				{
					type: 2,
					style: 2,
					custom_id: 'ban-info',
					label: 'Ban Information'
				}
			]
		}

		try {
			await interaction.channel.send({ embeds: [embed], components: [buttons] });
			await interaction.deleteReply();
		} catch (error) {
			console.error(error);
			await interaction.editReply('There was an error sending the message');
		}
	}
}