const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    userPerms: ["ManageRoles"],
    botPerms: ["ManageRoles"],
    data: new SlashCommandBuilder()
        .setName("role")
        .setDescription("Manage user roles")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName("add")
                .setDescription("Add a role to a user")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to add the role to")
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to add")
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName("remove")
                .setDescription("Remove a role from a user")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("The user to remove the role from")
                        .setRequired(true))
                .addRoleOption(option =>
                    option
                        .setName("role")
                        .setDescription("The role to remove")
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getMember("user");
        const targetRole = interaction.options.getRole("role");
        const moderator = interaction.member;
        const guild = interaction.guild;
        const bot = guild.members.cache.get(interaction.client.user.id);

        await interaction.deferReply({ ephemeral: true });

        try {
            const checks = [
                {
                    condition: !targetUser,
                    message: "Unable to find the specified user in this server."
                },
                {
                    condition: !targetRole,
                    message: "Unable to find the specified role in this server."
                },
                {
                    condition: targetRole.managed,
                    message: "This role is managed by an integration (bot/webhook) and cannot be manually assigned or removed."
                },
                {
                    condition: targetRole.id === guild.id,
                    message: "The @everyone role cannot be modified as it's a default role."
                },
                {
                    condition: !bot.roles.highest.position > targetRole.position,
                    message: "I cannot manage this role as it's positioned higher than my highest role."
                },
                {
                    condition: !moderator.roles.highest.position > targetRole.position,
                    message: "You cannot manage this role as it's positioned higher than or equal to your highest role."
                },
                {
                    condition: !moderator.roles.highest.position > targetUser.roles.highest.position,
                    message: "You cannot modify roles for this user as they have a role higher than or equal to your highest role."
                },
                {
                    condition: targetUser.id === guild.ownerId,
                    message: "Server owner's roles cannot be modified."
                },
                {
                    condition: targetUser.id === interaction.client.user.id,
                    message: "I cannot modify my own roles."
                },
                {
                    condition: subcommand === 'add' && targetUser.roles.cache.has(targetRole.id),
                    message: `${targetUser} already has the ${targetRole} role.`
                },
                {
                    condition: subcommand === 'remove' && !targetUser.roles.cache.has(targetRole.id),
                    message: `${targetUser} doesn't have the ${targetRole} role.`
                }
            ];

            for (const check of checks) {
                if (check.condition) {
                    throw new Error(check.message);
                }
            }

            if (subcommand === 'add') {
                await targetUser.roles.add(targetRole, `Role added by ${moderator.user.tag}`);
            } else {
                await targetUser.roles.remove(targetRole, `Role removed by ${moderator.user.tag}`);
            }

            const embed = new EmbedBuilder()
                .setColor("#89CFF0")
                .setTitle(`Role ${subcommand === 'add' ? 'Added' : 'Removed'}`)
                .addFields(
                    { name: 'User', value: `${targetUser}`, inline: true },
                    { name: 'Role', value: `${targetRole}`, inline: true },
                )
                .setDescription(`Successfully ${subcommand === 'add' ? 'added' : 'removed'} ${targetRole} ${subcommand === 'add' ? 'to' : 'from'} ${targetUser}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Role management error:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Role Management Error')
                .setDescription(error.message || 'An unexpected error occurred while managing roles.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};