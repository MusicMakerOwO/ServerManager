const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const silencedBulkDelete = require('../moderation/purgeMessages');

const FILTERS = {
    bot: m => m.author.bot,
    user: m => !m.author.bot,
    embed: m => m.embeds.length > 0,
    file: m => m.attachments.size > 0,
    link: m => /https?:\/\/[^\s]+/.test(m.content),
    image: m => m.attachments.some(a => a.contentType?.startsWith('image/')) || m.embeds.some(e => e.type === 'image'),
    text: m => m.content.length > 0 && !m.attachments.size && !m.embeds.length
};

module.exports = {
    cooldown: 10,
    userPerms: ["ManageMessages"],
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
            .setRequired(false))
        .addIntegerOption(x => x.setName("age")
            .setDescription("Maximum age of messages to delete (in hours)")
            .setMinValue(1)
            .setMaxValue(336) 
            .setRequired(false)),

    async execute(interaction) {
        const amount = interaction.options.getInteger("amount");
        const filter = interaction.options.getString("filters");
        const target = interaction.options.getUser("target");
        const contains = interaction.options.getString("contains")?.toLowerCase();
        const maxAge = interaction.options.getInteger("age");
        
        await interaction.deferReply({ ephemeral: true });

        try {
            const messages = await interaction.channel.messages.fetch({ 
                limit: amount,
                cache: false
            });

            let skipped = 0;
            const filters = [];
            const cutoff = maxAge ? Date.now() - (maxAge * 3600000) : 0;

            const toDelete = messages.filter(m => {
                if ((maxAge && m.createdTimestamp < cutoff) ||
                    (target && m.author.id !== target.id) ||
                    (contains && !m.content.toLowerCase().includes(contains)) ||
                    (filter && !FILTERS[filter](m))) {
                    skipped++;
                    return false;
                }
                return true;
            });

            if (!toDelete.size) throw { code: 'NO_MESSAGES' };

            target && filters.push(`User: ${target.tag}`);
            contains && filters.push(`Contains: "${contains}"`);
            filter && filters.push(`Type: ${filter}`);
            maxAge && filters.push(`Age: <${maxAge} hours`);

            const deleted = await silencedBulkDelete(
                interaction.client,
                interaction.channel.id,
                toDelete
            );

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#89CFF0')
                    .setTitle('Message Purge Results')
                    .setDescription(`**Details**
Messages Deleted: ${deleted.size}
Messages Skipped: ${skipped}
Messages Requested: ${amount}

**Location**
Channel: ${interaction.channel}
Moderator: ${interaction.user}

**Filters**
${filters.length ? filters.join('\n') : 'None'}`)
                    .setFooter({ text: `Purge completed in ${Date.now() - interaction.createdTimestamp}ms` })
                    .setTimestamp()]
            });

        } catch (error) {
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Error')
                    .setDescription(error.code === 'NO_MESSAGES' ? 'No messages matched your filter criteria.' :
                        error.code === 'MISSING_PERMISSIONS' ? 'I don\'t have permission to delete messages in this channel.' :
                        error.code === 50013 ? 'I don\'t have sufficient permissions to perform this action.' :
                        error.code === 50034 ? 'Some messages are too old to be bulk deleted.' :
                        'An unknown error occurred.')
                    .setTimestamp()]
            });
        }
    }
};
