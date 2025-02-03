const { SlashCommandBuilder } = require('@discordjs/builders');
const { PermissionsBitField: { Flags: Permissions } } = require('discord.js');
const { roles } = require('./rolemanage');

/*
2nd warn - 10 minute mute
3rd warn - 60 minute mute
4th warn - 6 hour mute
5th warn - 24 hour mute
6th warn - Kick
7th warn - Ban
*/

const PunishEnums = [
    {
        name: 'Verbal Warning',
        color: 0x00ffff
    },
    {
        name: '60 Minute Mute',
        color: 0xffff00,
		duration: 1000 * 60 * 60,
		function: 'muteUser'
    },
    {
        name: '6 Hour Mute',
        color: 0xff9900,
		duration: 1000 * 60 * 60 * 6,
		function: 'muteUser'
    },
    {
        name: '24 Hour Mute',
        color: 0xff0000,
		duration: 1000 * 60 * 60 * 24
    },
    {
        name: 'Kick',
        color: 0x770000,
		function: 'kickUser'
    },
    {
        name: 'Ban',
        color: 0x000000,
		function: 'banUser'
    }
];

module.exports = {
	roles: ['1198108657846583336'],
	data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manage a users warnings')
    .addSubcommand(command => command
        .setName('add')
        .setDescription('Warn a user (moderator only)')
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user to warn')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('reason')
            .setDescription('The reason for warning the user')
            .setRequired(true)
        )
    )
    .addSubcommand(command => command
        .setName('list')
        .setDescription('Check the warnings of a user')
        .addUserOption(option => option
            .setName('user')
            .setDescription('The user ID to check')
            .setRequired(true)
        )
    )
    .addSubcommand(command => command
        .setName('remove')
        .setDescription('Remove a warning from a user')
        .addStringOption(option => option
            .setName('warn-id')
            .setDescription('The id of the warning (/warn check to get the id)')
            .setRequired(true)
        )
    ),
	async execute(interaction, client) {

		const subcommand = interaction.options.getSubcommand();
		const user = interaction.options.getUser('user');
		const reason = interaction.options.getString('reason');
		const warnID = interaction.options.getString('warn-id');

		await interaction.deferReply().catch(() => {});

		if (subcommand === 'list') {

			const embed = {
				color: 0x2196f3,
				timestamp: new Date(),
				author: {
					name: `${user.username}'s Warnings`,
					icon_url: user.displayAvatarURL({ dynamic: true, size: 512 }),
				},
				description: ''
			}

			const warnings = client.db.prepare(`
				SELECT *
				FROM infractions
				WHERE userID = ?
				AND type = 'warn'
			`).all(user.id);

			if (!warnings.length) {
				embed.description = 'This user has no warnings';
			} else {
				for (const warning of warnings) {
					const warnTimestamp = Math.trunc( Date.parse(warning.created_at) / 1000) - (1000 * 60 * 60 * 5)
					embed.description += `
**Warn ID** : \`${warning.infractionID}\`
**Reason** : \`${warning.reason}\`
**Moderator** : <@${warning.modID}>
**Warned at** : <t:${warnTimestamp}:d> (<t:${warnTimestamp}:R>)\n`;
				}
			}

			return interaction.editReply({ embeds: [embed] });
		}

		if (subcommand === 'remove') {

			const embed = {
				color: 0x2196f3,
				timestamp: new Date(),
				author: {},
				title: '',
				description: ''
			}

			const warning = client.db.prepare(`
				SELECT *
				FROM infractions
				WHERE infractionID = ?
				AND type = 'warn'
			`).get(warnID);
			if (!warning) {
				embed.description = '❓ Warning not found';
				embed.timestamp = null
				return interaction.editReply({ embeds: [embed] });
			}

			const userLookup = client.users.cache.get(warning.userID) ?? { username: '[Deleted User]', displayAvatarURL: () => '' };

			embed.title = `Removed warning ${warnID} from ${userLookup.username}`;			
			embed.author = {
				icon_url: userLookup.displayAvatarURL({ dynamic: true, size: 512 }),
			},

			client.db.prepare(`
				DELETE FROM infractions
				WHERE infractionID = ?
			`).run(warnID);

			embed.description = `
**Reason** : \`${warning.reason}\`
**Moderator** : <@${warning.modID}>
**Timestamp** : <t:${Math.trunc( Date.parse(warning.created_at) / 1000) - (1000 * 60 * 60 * 5)}:d>`;
			return interaction.editReply({ embeds: [embed] });
		}

		if (subcommand === 'add') {

			client.db.prepare(`
				INSERT INTO infractions (userID, modID, reason, type)
				VALUES (?, ?, ?, 'warn')
			`).run(user.id, interaction.user.id, reason);

			const warningsLastMonth = client.db.prepare(`
				SELECT COUNT(*)
				FROM infractions
				WHERE userID = ?
				AND type = 'warn'
				AND created_at > datetime(CURRENT_TIMESTAMP, '-1 month')
			`).pluck().get(user.id);

			const warnID = client.db.prepare(`
				SELECT MAX(infractionID)
				FROM infractions
			`).pluck().get();

			const warnIndex = Math.min(warningsLastMonth, PunishEnums.length) - 1;

			const priorPunishments = PunishEnums.slice(0, warnIndex);
			const currentPunishment = PunishEnums[warnIndex];
			const futurePunishments = PunishEnums.slice(warnIndex + 1);

			const userEmbed = {
				color: currentPunishment.color,
				timestamp: new Date(),
				description: `
⚠️ **You have been warned in ${interaction.guild.name}**
Reason : \`${reason}\`
Timestamp: <t:${~~(Date.now() / 1000)}:d>

**Punishments**
${priorPunishments.map(punish => `✅ - ${punish.name}`).join('\n')}
💥 - ${currentPunishment.name}
${futurePunishments.map(punish => `❌ - ${punish.name}`).join('\n')}

**Note** : Only warnings within the last 30 days are counted`
			}

			const modEmbed = {
				color: currentPunishment.color,
				timestamp: new Date(),
				description: `
⚠️ **${user.globalName ?? user.username} has been warned**
Warn ID : ${warnID}
Reason : \`${reason}\`
Timestamp: <t:${~~(Date.now() / 1000)}:d>

**Punishments**
${priorPunishments.map(punish => `✅ - ${punish.name}`).join('\n')}
💥 - ${currentPunishment.name}
${futurePunishments.map(punish => `❌ - ${punish.name}`).join('\n')}

**Note** : Only warnings within the last 30 days are counted`
			}

			user.send({ embeds: [userEmbed] }).catch(() => {
				modEmbed.description += `\n\n🚩 I was not able to send ${user.globalName ?? user.username} a DM!`;
			});

			if (warnIndex > 0) {
				if (typeof client[currentPunishment.function] === 'function') {
					client[currentPunishment.function](interaction.guild.id, user.id, currentPunishment.duration);
				} else {
					console.log(`No function found for client.${currentPunishment.function}`);
				}
			}

			return interaction.editReply({ embeds: [modEmbed] });
		}
	}
}
