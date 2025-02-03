const { SlashCommandBuilder } = require('discord.js'); 
const { roles } = require('./ban');

module.exports = {
	roles: ['1198108657846583336'],
    data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute/timeout a member')
    .addUserOption(x => x
		.setName('user')
		.setDescription('The user to mute')
		.setRequired(true)
	)
    .addStringOption(x => x
		.setName('duration')
		.setRequired(true)
		.setDescription('The duration of the timeout')
		.addChoices(
			{ name: '60 Secs', value: '60'},
			{ name: '5 Minutes', value: '300'},
			{ name: '10 Minutes', value: '600'},
			{ name: '30 Minutes', value: '1800'},
			{ name: '45 Minutes', value: '2700'},
			{ name: '1 Hour', value: '3600'},
			{ name: '2 Hours', value: '7200'},
			{ name: '3 Hours', value: '10800'},
			{ name: '6 Hours', value: '18000'},
			{ name: '9 Hours', value: '32400'},
			{ name: '12 Hours', value: '36000'},
			{ name: '1 Day', value: '86400'},
			{ name: '2 Days', value: '172800'},
			{ name: '3 Days', value: '259200'},
			{ name: '4 Days', value: '432000'},
			{ name: '5 Days', value: '518400'},
			{ name: '6 Days', value: '604800'},
			{ name: 'One Week', value: '604800'}
		)
	)
    .addStringOption(x => x
		.setName('reason')
		.setDescription('The reason for the mute')
	),
    execute: async function (interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('user'); 
        const duration = parseInt( interaction.options.getString('duration')) * 1000;
        const reason = interaction.options.getString('reason') ?? 'No reason provided';
		
		if (user.id === client.user.id) return await interaction.editReply({ content: 'Are you kidding me??? #BotLivesMatter 🤖' });
		if (user.id === interaction.guild.ownerId) return await interaction.editReply({ content: 'Why would you do that? 💀' });
		if (user.id === interaction.user.id) return await interaction.editReply({ content: 'Stop it. Get some help.' });

        const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);

		if (!member) return await interaction.editReply({ content: `⚠️ I was not able to find this user!` });
		if (member.roles.highest.position > interaction.member.roles.highest.position) return await interaction.editReply({ content: `⚠️ You cannot timeout this user!` });

        const modEmbed = {
			color: 0x2196f3,
			description: `🛠️ I have timed out ${user} for ${duration / 1000 / 60} minute(s); reason: ${reason}`
		}

        const dmEmbed = {
			color: 0xff0000,
			description: `
⚠️ You have been timed out in **${interaction.guild.name}** for ${duration / 60} minute(s)
**Reason:** \`\`\`${reason}\`\`\``
		}

        try {
            await client.muteUser(user, duration);
        } catch (e) {
            console.log(e)
            return await interaction.editReply({ content: `⚠️ I was not able to timeout ${user}!`});
        }

		try {
			await user.send({ embeds: [dmEmbed] })
		} catch (error) {
            modEmbed.description += '\n\n⚠️ I was not able to send this user a DM!';
        };

        await interaction.editReply({ embeds: [modEmbed] });

    }
}