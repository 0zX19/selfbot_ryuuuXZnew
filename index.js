require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const { Tokens1, Prefix1, Owner, VoiceChannelID } = require('./config.js');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');

if (!Array.isArray(Tokens1) || Tokens1.length === 0) {
    console.error('No tokens provided in config.js. Ensure Tokens1 is an array of valid tokens.');
    process.exit(1);
}

Tokens1.forEach((token, index) => {
    const client1 = new Client();

    client1.on('ready', () => {
        client1.user.setPresence({ status: 'online' });
        console.log(`Logged in as ${client1.user.tag} with Token${index + 1}!`);

        // Attempt to join voice channel
        const voiceChannel = client1.channels.cache.get(VoiceChannelID);
        if (voiceChannel && voiceChannel.type === 'GUILD_VOICE') {
            joinVoice(client1, voiceChannel);
        } else {
            console.error('Voice channel not found or invalid. Check the VoiceChannelID in config.js.');
        }
    });

    client1.on('messageCreate', async (message) => {
        if (message.author.bot || !Owner.includes(message.author.id)) return;

        // Command: Leave voice channel
        if (message.content.startsWith(`${Prefix1}leave`)) {
            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.destroy();
                message.reply('Left the voice channel.');
            } else {
                message.reply('Not connected to any voice channel.');
            }
        }
    });

    client1.on('voiceStateUpdate', (oldState, newState) => {
        const connection = getVoiceConnection(newState.guild.id);
        const voiceChannel = client1.channels.cache.get(VoiceChannelID);

        // Rejoin voice channel if bot is disconnected manually
        if (newState.id === client1.user.id && oldState.channelId !== null && newState.channelId === null) {
            console.log('Bot was manually disconnected. Rejoining...');
            if (voiceChannel) reconnectVoiceChannel(client1, voiceChannel);
        }

        // Handle if bot is forcefully disconnected and connection is destroyed
        if (!connection && oldState.channelId !== null && newState.channelId === null) {
            console.log('Connection lost, attempting to reconnect...');
            if (voiceChannel) reconnectVoiceChannel(client1, voiceChannel);
        }
    });

    client1.login(token).catch((error) => {
        console.error(`Failed to log in with Token${index + 1}:`, error);
    });
});

/**
 * Joins a specified voice channel.
 * @param {Client} client - The Discord client instance.
 * @param {VoiceChannel} voiceChannel - The voice channel to join.
 */
function joinVoice(client, voiceChannel) {
    try {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: false,
        });

        // Handle connection lifecycle
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('Voice connection disconnected, attempting to reconnect...');
            connection.destroy(); // Destroy old connection
            reconnectVoiceChannel(client, voiceChannel);
        });

        console.log(`Joined voice channel: ${voiceChannel.name}`);
    } catch (error) {
        console.error('Failed to join voice channel:', error);
    }
}

/**
 * Reconnects the bot to the specified voice channel.
 * @param {Client} client - The Discord client instance.
 * @param {VoiceChannel} voiceChannel - The voice channel to join.
 */
function reconnectVoiceChannel(client, voiceChannel) {
    setTimeout(() => {
        try {
            joinVoice(client, voiceChannel);
        } catch (error) {
            console.error('Failed to rejoin voice channel:', error);
        }
    }, 5000); // Retry after 5 seconds
}
