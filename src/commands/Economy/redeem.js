import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

// Change this to whatever you want your secret code to be
const SECRET_PASSWORD = "FATIH"; 

export default {
    data: new SlashCommandBuilder()
        .setName('redeem')
        .setDescription('Redeem a special access code for a balance adjustment')
        .addStringOption(option => 
            option.setName('password')
                .setDescription('Enter the secret system password')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of cash to add to your wallet')
                .setRequired(true)),

    execute: withErrorHandling(async (interaction, config, client) => {
        // 'ephemeral: true' makes the response invisible to everyone else
        const deferred = await InteractionHelper.safeDefer(interaction, { ephemeral: true });
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const enteredPassword = interaction.options.getString("password");
        const amountToAdd = interaction.options.getInteger("amount");

        // 1. Password Verification
        if (enteredPassword !== SECRET_PASSWORD) {
            throw createError(
                "Access Denied",
                ErrorTypes.VALIDATION,
                "Invalid security credentials. This attempt has been logged.",
                { userId }
            );
        }

        // 2. Fetch and Update Economy Data
        const userData = await getEconomyData(client, guildId, userId);
        userData.wallet = (userData.wallet || 0) + amountToAdd;

        // 3. Save the new balance to the database
        await setEconomyData(client, guildId, userId, userData);

        const resultEmbed = successEmbed(
            "🔒 System Access Granted",
            `Credentials verified. **$${amountToAdd.toLocaleString()}** has been injected into your wallet.`
        );

        await InteractionHelper.safeEditReply(interaction, { embeds: [resultEmbed] });
    }, { command: 'redeem' })
};
