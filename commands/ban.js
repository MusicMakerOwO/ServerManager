const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	roles: ['1198108657846583336'],
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('Ban a user from the server')
		.addUserOption( x => x
			.setName('user')
			.setDescription('The user to ban')
			.setRequired(true)
		)
		.addStringOption( x => x
			.setName('reason')
			.setDescription('The reason for banning the user')
			.setRequired(true)
		)
		.addBooleanOption( x => x
			.setName('can_appeal')
			.setDescription('Whether the user can appeal the ban')
		),
	async execute(interaction, client) {
		// don't actually ban, remove all roles and give banned role

		await interaction.deferReply();

		if (!interaction.member.permissions.has('BanMembers')) return await interaction.editReply('✨ Only Moderators/Admins can ban people within this server');

		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason') ?? 'No reason provided';
		const canAppeal = interaction.options.getBoolean('can_appeal') ?? true;
		
		const embed = {
			title: '',
			description: '',
			author: {
				icon_url: user.displayAvatarURL({ dynamic: true, size: 512 }),
			},
			timestamp: new Date(),
			color: 0x2196f3,
		}

		const DMEmbed = {
			color: 0xff0000,
			timestamp: new Date(),
			description: `
⚠️ You have been banned from ${interaction.guild.name}
**Reason** : \`${reason}\`

**What does this mean?**
You are not fully banned from the server but you have been restricted to sending messages or joining voice channels. You can still view rules, DM ModMail, and contact staff members. You are welcome to appeal the ban however it is not guaranteed that it will be lifted. Leaving the server will not lift the ban, adding an alt will result in a permanent ban with no appeal. If you have any questions or concerns, please contact a staff member or DM ModMail.`
		}


		const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);

		if (user.id === client.user.id) return await interaction.editReply({ content: 'Fuck you' });
		if (user.id === interaction.guild.ownerId) return await interaction.editReply({ content: 'Why would you do that...?' });
		if (user.id === interaction.user.id) return await interaction.editReply({ content: 'Don\'t ban yourself, Null (RIP Null and his non-existent activity)' });
		if (member.roles.highest.position >= interaction.member.roles.highest.position) return await interaction.editReply({ content: 'You cannot ban someone with a role higher or equal to your own you donut' });
		
		const currentlyBanned = await client.db.prepare(`
			SELECT *
			FROM infractions
			WHERE userID = ?
			AND type = 'ban'
		`).get(user.id);
		if (currentlyBanned) {
			// update ban reason
			await client.db.prepare(`
				UPDATE infractions
				SET reason = ?
				WHERE infractionID = ?
			`).run(reason, currentlyBanned.infractionID);

			embed.title = `${user.username} is already banned`
			embed.author = {
				icon_url: user.displayAvatarURL({ dynamic: true, size: 512 })
			}
			embed.description = `
Ban reason has been updated
**Can Appeal** :  ${canAppeal ? `${client.config.YES_EMOJI}` : `${client.config.NO_EMOJI}`}
**Reason** : \`${reason}\``;

			await interaction.editReply({ embeds: [embed] });

			if (member) {
				// dm the user of the updates
				DMEmbed.description = `
⚠️ Your ban has been updated in ${interaction.guild.name}
**Can Appeal** :  ${canAppeal ? `${client.config.YES_EMOJI}` : `${client.config.NO_EMOJI}`}
**New Reason** : \`${reason}\``;
				await user.send({ embeds: [DMEmbed] }).catch(() => {});
			}

			return;

		}

		client.db.prepare(`
			INSERT INTO infractions (userID, modID, type, reason, can_appeal)
			VALUES (?, ?, ?, ?, ?)
		`).run(user.id, interaction.user.id, 'ban', reason, +canAppeal);

		embed.description = `
**Can Appeal** :  ${canAppeal ? `${client.config.YES_EMOJI}` : `${client.config.NO_EMOJI}`}
**Reason** : \`${reason}\``; 

		if (!member) {
			embed.description += `\n\n**Note** : User is not in the server, they will be banned if they join`;
		} else {
			try {
				await client.editRoles(interaction.guild.id, user.id, [client.config.BANNED_ROLE_ID]);
				embed.description = `🛠️ Successfully banned ${user.username} (${user.id})\n${embed.description}`;
				embed.author = {
					icon_url: user.displayAvatarURL({ dynamic: true, size: 512 })
				}
			} catch (error) {
				embed.title = `Failed to ban ${user.username}`;
				embed.description = `🚩 Failed to update roles on user\n\n${embed.description}`;
				embed.color = 0xc62828;
				return interaction.editReply({ embeds: [embed] });
			}

			await user.send({ embeds: [DMEmbed] }).catch(() => {
				embed.description += `\n\n🚩 Could not DM user to inform`;
			});
		}

		await interaction.editReply({ embeds: [embed] });
	}
}
