module.exports = {
	customID: 'appealForm',
	execute: async function(interaction, client, [ action ] = ['view']) {
		const user = interaction.user;
		const banData = client.db.prepare(`
			SELECT *
			FROM infractions
			WHERE userID = ?
			AND type = 'ban'
		`).get(user.id);

		const mod = await client.users.cache.get(banData?.modID) ?? await client.users.fetch(banData?.modID).catch(() => null);
		const modName = mod ? mod.tag : 'Unknown';
		const appealID = banData?.infractionID || 'Unknown';

		const embed = {
			color: 0x89CFF0,
			author: {
				name: `Appeal from ${user.tag}`,
				icon_url: user.displayAvatarURL({ dynamic: true, size: 256 })
			},
			title: `Appeal Request #${appealID}`,
			description: `**Ban Information**
		• Case Moderator: ${modName}
		• Reason: ${banData?.reason || 'No reason provided'}
		
		**Appeal Questions**\n`,
			fields: [],
			timestamp: new Date(),
			footer: {
				text: `User ID: ${user.id}`,
				icon_url: user.displayAvatarURL({ dynamic: true, size: 256 })
			}
		};

		/*
		client.cache.set(`appeal-${interaction.user.id}`, {
			appealID: banData.infractionID,
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
		*/

		if (action === 'cancel-confirm') {
			await interaction.deferUpdate().catch(() => {});
			client.cache.delete(`appeal-${interaction.user.id}`);
			await interaction.deleteReply().catch(() => {});
			return;
		}

		if (action === 'cancel') {
			await interaction.deferUpdate().catch(() => {});
			embed.description = 'Are you sure you want to cancel the appeal?';
			embed.color = 0xff0000;
			const actionButtons = {
				type: 1,
				components: [
					{
						type: 2,
						style: 3,
						custom_id: 'appealForm_view',
						label: 'Take me back!'
					},
					{
						type: 2,
						style: 4,
						custom_id: 'appealForm_cancel-confirm',
						label: 'Delete Appeal'
					}
				]
			}
			return interaction.editReply({ embeds: [embed], components: [actionButtons] });
		}


		const cacheData = client.cache.get(`appeal-${interaction.user.id}`);
		if (!cacheData) {
			embed.description = '🚩 You do not have an active appeal, if this is a mistake please restart the process';
			await interaction.deferUpdate().catch(() => {});
			return interaction.editReply({ embeds: [embed], components: [] });
		}

		if (/^\d+$/.test(action) && cacheData.questions[action]) {
			const questionData = cacheData.questions[action];
			const modal = {
				title: 'Ban Appeal',
				custom_id: `appealForm_${action}`,
				components: [{
					type: 1,
					components: [{
						type: 4,
						style: 2,
						custom_id: 'data',
						label: questionData.shortText,
						value: questionData.answer || ''
					}]
				}]
			}

			await interaction.showModal(modal);
			return;
		}

		await interaction.deferUpdate().catch(() => {});

		if (action === 'view') {
			const buttons = {
				type: 1,
				components: []
			}

			for (const [ questionID, questionData ] of Object.entries(cacheData.questions)) {
				embed.description += `${questionData.emoji} **${questionData.question}**\n\`\`\`\n${questionData.answer || '\u200b'}\n\`\`\`\n`;
				buttons.components.push({
					type: 2,
					style: 2,
					custom_id: `appealForm_${questionID}`,
					label: questionData.shortText,
					emoji: questionData.emoji
				});
			}

			const actionButtons = {
				type: 1,
				components: [
					{
						type: 2,
						style: 4,
						custom_id: 'appealForm_cancel',
						label: 'Cancel'
					},
					{
						type: 2,
						style: 3,
						custom_id: 'appealForm_submit',
						label: 'Submit',
						disabled: Object.values(cacheData.questions).some(q => !q.answer)
					}
				]
			}

			await interaction.editReply({ embeds: [embed], components: [buttons, actionButtons] });
			return;
		}

		if (action === 'submit') {

			client.db.prepare(`
				INSERT INTO infraction_appeals (infractionID)
				VALUES (?)
			`).run(cacheData.infractionID);

			const appealID = client.db.prepare(`
				SELECT MAX(appealID)
				FROM infraction_appeals
			`).pluck().get();

			const querySubmitAnswer = client.db.prepare(`
				INSERT INTO appeal_answers (appealID, questionID, answer)
				VALUES (?, ?, ?)
			`);

			const queryAddQuestion = client.db.prepare(`
				INSERT INTO appeal_questions (question)
				VALUES (?)
				ON CONFLICT DO NOTHING
			`);

			const queryFindQuestionID = client.db.prepare(`
				SELECT questionID
				FROM appeal_questions
				WHERE question = ?
			`);

			for (const { question, answer } of cacheData.questions) {
				queryAddQuestion.run(question);
				const questionData = queryFindQuestionID.get(question);
				querySubmitAnswer.run(appealID, questionData.questionID, answer);
			}

			const channel = client.channels.cache.get("1279861284111650950") ?? await client.channels.fetch("1279861284111650950").catch(() => null);
			const user = await client.users.cache.get(cacheData.userID) ?? await client.users.fetch(cacheData.userID).catch(() => null);

			const banData = client.db.prepare(`
				SELECT *
				FROM infractions
				WHERE userID = ?
				AND type = 'ban'
			`).get(interaction.user.id);

			embed.author = {
				name: user.tag,
				icon_url: user.displayAvatarURL({ dynamic: true, size: 256 })
			}

			const mod = await client.users.cache.get(banData?.modID) ?? await client.users.fetch(banData?.modID).catch(() => null);
			const modName = mod ? mod.tag : 'Unknown';

			for (const [questionID, questionData] of Object.entries(cacheData.questions)) {
				embed.description += `\n${questionData.emoji} **${questionData.question}**\n\`\`\`${questionData.answer || 'No answer provided'}\`\`\``;
			}

			embed.description += `\n**Ban Reason**: ${banData?.reason || 'No reason provided'}\n**Banned By**: ${modName}`;

			embed.footer = {
				text: `${user.tag} | User ID: ${user.id}`,
				icon_url: user.displayAvatarURL({ dynamic: true, size: 256 })
			}

			const staffButton = {
				type: 1,
				components: [
					{
						type: 2,
						style: 2,
						custom_id: `staff-appeal_${appealID}_approved`,
						label: 'Approve',
						emoji: client.config.YES_EMOJI
					},
					{
						type: 2,
						style: 2,
						custom_id: `staff-appeal_${appealID}_denied`,
						label: 'Deny',
						emoji: client.config.NO_EMOJI
					}
				]
			}

			try {
				await channel.send({ embeds: [embed], components: [staffButton] });
			} catch (error) {
				console.error(error);
				return interaction.editReply({ content: '🚩 Failed to submit appeal, please try again later', embeds: [], components: [] });
			}

			client.cache.delete(`appeal-${interaction.user.id}`);
			return interaction.editReply({ content: '✅ Appeal submitted, please be patient and give the team some time to review your appeal', embeds: [], components: [] });
		}

	}
}