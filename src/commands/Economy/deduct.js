import { SlashCommandBuilder } from 'discord.js';
import { warningEmbed, successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// Use the same secret password as your redeem command
const SECRET_PASSWORD = "FATIH"; 

export default {
    data: new SlashCommandBuilder()
        .setName('deduct')
        .setDescription('Deduct cash from a wallet using a system password')
        .addStringOption(option => 
            option.setName('password')
                .setDescription('The secret system password')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of cash to remove')
                .setRequired(true))
        // --- NEW USER OPTION ADDED HERE ---
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to deduct from (leave blank to target yourself)')
                .setRequired(false)),

    execute: withErrorHandling(async (interaction, config, client) => {
        // Keeps the deduction secret from other members
        const deferred = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferred) return;

        const guildId = interaction.guildId;
        const enteredPassword = interaction.options.getString("password");
        const amountToRemove = interaction.options.getInteger("amount");
        
        // --- TARGET USER LOGIC ---
        // Get the user from the option, or default to the person running the command
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetUserId = targetUser.id;

        // 1. Password Check
        if (enteredPassword !== SECRET_PASSWORD) {
            throw createError(
                "Unauthorized Deduction",
                ErrorTypes.VALIDATION,
                "Incorrect password. Management has been notified of this attempt."
            );
        }

        // 2. Update Economy Data (Using targetUserId instead of interaction.user.id)
        const userData = await getEconomyData(client, guildId, targetUserId);
        
        // Calculation: 
        // We use Math.max(0, ...) to ensure the balance doesn't drop below zero
        const oldBalance = userData.wallet || 0;
        userData.wallet = Math.max(0, oldBalance - amountToRemove);

        // 3. Save to Postgres Database (Using targetUserId)
        await setEconomyData(client, guildId, targetUserId, userData);

        // Determine the correct wording for the success message
        const targetString = targetUser.id === interaction.user.id ? "your" : `${targetUser}'s`;

        const resultEmbed = successEmbed(
            "📉 Balance Deducted",
            `System adjusted. Removed **$${amountToRemove.toLocaleString()}** from ${targetString} wallet.\n\n**New Balance:** $${userData.wallet.toLocaleString()}`
        );

        await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'deduct' })
};
