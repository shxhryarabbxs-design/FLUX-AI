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
        .setDescription('Deduct cash from your wallet using a system password')
        .addStringOption(option => 
            option.setName('password')
                .setDescription('The secret system password')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of cash to remove')
                .setRequired(true)),

    execute: withErrorHandling(async (interaction, config, client) => {
        // Keeps the deduction secret from other members
        const deferred = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const enteredPassword = interaction.options.getString("password");
        const amountToRemove = interaction.options.getInteger("amount");

        // 1. Password Check
        if (enteredPassword !== SECRET_PASSWORD) {
            throw createError(
                "Unauthorized Deduction",
                ErrorTypes.VALIDATION,
                "Incorrect password. Management has been notified of this attempt."
            );
        }

        // 2. Update Economy Data
        const userData = await getEconomyData(client, guildId, userId);
        
        // Calculation: 
        // We use Math.max(0, ...) to ensure the balance doesn't drop below zero
        const oldBalance = userData.wallet || 0;
        userData.wallet = Math.max(0, oldBalance - amountToRemove);

        // 3. Save to Postgres Database
        await setEconomyData(client, guildId, userId, userData);

        const resultEmbed = successEmbed(
            "📉 Balance Deducted",
            `System adjusted. Removed **$${amountToRemove.toLocaleString()}** from your wallet.\n\n**New Balance:** $${userData.wallet.toLocaleString()}`
        );

        await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'deduct' })
};
