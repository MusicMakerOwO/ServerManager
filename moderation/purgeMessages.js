module.exports = async function(client, channelID, messages, options = {}) {
    const channel = client.channels.cache.get(channelID);
    if (!channel) throw new Error(`Unknown channelID: ${channelID}`);

    try {
        client.auditListener.silenceEvent('messageDelete');
        client.auditListener.silenceEvent('messageBulkDelete');

        const deleted = await channel.bulkDelete(messages, true);
        return deleted;
    } catch (error) {
        throw new Error(`Failed to bulk delete messages: ${error}`);
    }
}