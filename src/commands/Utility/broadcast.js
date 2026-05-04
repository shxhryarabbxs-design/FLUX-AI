import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// Change this to your preferred secret password
const SECRET_PASSWORD = "FATIH"; 

export default {
    data: new SlashCommandBuilder()
        .setName('broadcast')
        .setDescription('Send an authorized announcement through the bot')
        .addStringOption(option => 
            option.setName('password')
                .setDescription('The secret system password')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Select the channel for the announcement')
                .setRequired(true) // Now explicitly required
                .addChannelTypes(ChannelType.GuildText))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The text you want the bot to post')
                .setRequired(true)),

    execute: withErrorHandling(async (interaction, config, client) => {
        // Ephemeral ensures only you see the password and the confirmation
        const deferred = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferred) return;

        const enteredPassword = interaction.options.getString("password");
        const content = interaction.options.getString("message");
        const targetChannel = interaction.options.getChannel("channel");

        // 1. Password Security Check
        if (enteredPassword !== SECRET_PASSWORD) {
            throw createError(
                "Unauthorized Access",
                ErrorTypes.VALIDATION,
                "The password provided is incorrect. This attempt has been logged."
            );
        }

        // 2. Sending the Message
        try {
            await targetChannel.send(content);
        } catch (error) {
            throw createError(
                "Delivery Failed",
                ErrorTypes.INTERNAL,
                `I couldn't send the message to ${targetChannel}. Check my permissions!`
            );
        }

        // 3. Success Confirmation (Visible only to you)
        const resultEmbed = successEmbed(
            "📢 Announcement Successful",
            `Your message has been posted in ${targetChannel}.`
        );

        await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'broadcast' })
};
