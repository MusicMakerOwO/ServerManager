module.exports = {
	customID: 'appealForm',
	execute: async function(interaction, client, [ questionID ] = ['0']) {
		const cacheData = client.cache.get(`appeal-${interaction.user.id}`);
		if (!cacheData) {
			return interaction.update({
				content: '🚩 You do not have an appeal in progress',
				components: [],
				embeds: []
			});
		}

		const input = interaction.fields.getTextInputValue('data');

		const questionData = cacheData.questions[questionID];
		questionData.answer = input;
		client.cache.set(`appeal-${interaction.user.id}`, cacheData);

		await interaction.deferUpdate().catch(() => {});

		const button = client.buttons.get('appealForm');
		await button.execute(interaction, client, [ 'view' ]);
	}
}