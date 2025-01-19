const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    userPerms: ['ModerateMembers'],
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks specified user.')
        .addUserOption(option => option
            .setName('user')
            .setDescription('Specify the user you want to kick.')
            .setRequired(true))
        .addStringOption(option => option
            .setName('reason')
            .setDescription('Reason as to why you want to kick specified user.')
            .setRequired(false))
        .addBooleanOption(option => option
            .setName('young-account')
            .setDescription('For users under 7d account age.')
            .setRequired(false)),

    execute: async function(interaction, client) {
        await interaction.deferReply();

        const user = interaction.options.getUser('user');
        const kickedMember = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const youngAccount = interaction.options.getBoolean('young-account') || false;

        if (user.id === client.user.id) return await interaction.editReply({ content: 'Are you kidding me??? #BotLivesMatter 🤖' });
        if (user.id === interaction.guild.ownerId) return await interaction.editReply({ content: 'Why would you do that? 💀' });
        if (user.id === interaction.user.id) return await interaction.editReply({ content: 'Stop it. Get some help.' });
        if (!kickedMember) return await interaction.editReply({ content: '⚠️ I was not able to find this user!' });
        if (kickedMember.roles.highest.position >= interaction.member.roles.highest.position) 
            return await interaction.editReply({ content: 'You cannot kick someone with a role higher or equal to your own you donut' });


        const dmEmbed = {
            color: 0xff0000,
            timestamp: new Date(),
            title: 'You have been kicked',
            author: {
				icon_url: interaction.guild.iconURL({ dynamic: true, size: 512 }),
			},
            description: youngAccount ? 
                `> You have been kicked from ${interaction.guild.name} because your account is too young. You may rejoin after your account is at least 7 days old. Joining back before this may result in a ban.` :
                `> You have been kicked from ${interaction.guild.name}\n\n**Reason**: ${reason}`
        };

        const embed = {
            color: 0x2196f3,
            timestamp: new Date(),
            title: 'User has been kicked',
            author: {
				icon_url: user.displayAvatarURL({ dynamic: true, size: 512 }),
			},
            description: youngAccount ?
                `> 👢 Successfully kicked ${user.tag} (Young Account < 7 days)` :
                `> 👢 Successfully kicked ${user.tag}\n\n**Reason**: ${reason}`
        };

        await user.send({ embeds: [dmEmbed] }).catch(() => {
            embed.description += '\n🚩 Failed to send DM to user';
        });

        try {
            await client.kickUser(interaction.guild.id, user.id, reason);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            return interaction.editReply({ 
                content: '🚩 Failed to kick user. Please check my role position and permissions.',
                embeds: []
            });
        }
    }
};