const { SlashCommandBuilder } = require('discord.js'); 

module.exports = {
	userPerms: [ 'ModerateMembers' ],
    data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member')
    .addUserOption(x => x
		.setName('user')
		.setDescription('The user to mute')
		.setRequired(true)
	),
    execute: async function (interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const user = interaction.options.getUser('user');
		
		if (user.id === client.user.id) return await interaction.editReply({ content: 'Are you kidding me??? #BotLivesMatter 🤖' });
		if (user.id === interaction.guild.ownerId) return await interaction.editReply({ content: 'Why would you do that? 💀' });
		if (user.id === interaction.user.id) return await interaction.editReply({ content: 'Stop it. Get some help.' });

        const member = interaction.guild.members.cache.get(user.id) ?? await interaction.guild.members.fetch(user.id).catch(() => null);

		if (!member) return await interaction.editReply({ content: `⚠️ I was not able to find this user!` });
		if (member.roles.highest.position > interaction.member.roles.highest.position) return await interaction.editReply({ content: `⚠️ You cannot timeout this user!` });

        const modEmbed = {
			color: 0x2196f3,
			description: `🛠️ I have removed the timeout on ${user}`
		}

        const dmEmbed = {
			color: 0x2196f3,
			description: `🛠️ Your timeout has been removed in ${interaction.guild.name}`
		}

        try {
            await client.muteUser(interaction.guild.id, user.id, null);
        } catch (e) {
            console.log(e)
            return await interaction.editReply({ content: `⚠️ I was not able to remove the timeout on ${user}!`});
        }

		try {
			await user.send({ embeds: [dmEmbed] })
		} catch (error) {
            modEmbed.description += '\n\n⚠️ I was not able to send this user a DM!';
        };

        await interaction.editReply({ embeds: [modEmbed] });

    }
}