const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const silencedBulkDelete = require('../moderation/purgeMessages');

module.exports = {
    userPerms: [ "ManageMessages" ],
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Bulk delete messages from this channel (Moderators/Admins)")
        .addIntegerOption(x => x.setName("amount")
            .setDescription("How many messages do you want to remove from this channel")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true))
        .addStringOption(x => x.setName("filters")
            .setDescription("Any specific filters that you want?")
            .setRequired(false)
            .addChoices(
                { name: 'Bot Messages', value: 'bot' },
                { name: 'User Messages', value: 'user' },
                { name: 'Embeds Only', value: 'embed' },
                { name: 'Files/Attachments', value: 'file' },
                { name: 'Links', value: 'link' },
                { name: 'Images', value: 'image' },
                { name: 'Text Only', value: 'text' }
            ))
        .addUserOption(x => x.setName("target")
            .setDescription("Delete messages from a specific user")
            .setRequired(false))
        .addStringOption(x => x.setName("contains")
            .setDescription("Delete messages containing specific text")
            .setRequired(false)),

    async execute(interaction) {
        const amount = interaction.options.getInteger("amount");
        const filter = interaction.options.getString("filters");
        const target = interaction.options.getUser("target");
        const contains = interaction.options.getString("contains");

        await interaction.deferReply({ ephemeral: true });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: amount });
            let filterDescription = [];

            if (target) {
                messages = messages.filter(m => m.author.id === target.id);
                filterDescription.push(`User: ${target.tag}`);
            }

            if (contains) {
                messages = messages.filter(m => m.content.toLowerCase().includes(contains.toLowerCase()));
                filterDescription.push(`Contains: "${contains}"`);
            }

            if (filter) {
                switch (filter) {
                    case 'bot':
                        messages = messages.filter(m => m.author.bot);
                        filterDescription.push('Type: Bot Messages');
                        break;
                    case 'user':
                        messages = messages.filter(m => !m.author.bot);
                        filterDescription.push('Type: User Messages');
                        break;
                    case 'embed':
                        messages = messages.filter(m => m.embeds.length > 0);
                        filterDescription.push('Type: Embeds');
                        break;
                    case 'file':
                        messages = messages.filter(m => m.attachments.size > 0);
                        filterDescription.push('Type: Files');
                        break;
                    case 'link':
                        messages = messages.filter(m => m.content.match(/https?:\/\/[^\s]+/));
                        filterDescription.push('Type: Links');
                        break;
                    case 'image':
                        messages = messages.filter(m => 
                            m.attachments.some(attach => 
                                attach.contentType?.startsWith('image/')) || 
                            m.embeds.some(embed => embed.type === 'image')
                        );
                        filterDescription.push('Type: Images');
                        break;
                    case 'text':
                        messages = messages.filter(m => 
                            m.content.length > 0 && 
                            m.attachments.size === 0 && 
                            m.embeds.length === 0
                        );
                        filterDescription.push('Type: Text Only');
                        break;
                }
            }

            const deleted = await silencedBulkDelete(
                interaction.client, 
                interaction.channel.id, 
                messages
            );

            const embed = new EmbedBuilder()
            .setColor('#89CFF0')
            .setTitle('Message Purge Results')
            .setDescription(`**Details**
        Messages Deleted: ${deleted.size}
        Messages Requested: ${amount}
        
        **Location**
        Channel: ${interaction.channel}
        Moderator: ${interaction.user}
        
        **Filters**
        ${filterDescription.length ? filterDescription.join('\n') : 'None'}`)
            .setTimestamp();

            await interaction.editReply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription([
                    'An error occurred while trying to purge messages.',
                    '',
                    'Possible reasons:',
                    '• Messages are older than 14 days',
                    '• No messages matched the filter criteria',
                    '• Missing permissions'
                ].join('\n'))
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};