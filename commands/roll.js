const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const economyPath = path.join(__dirname, '..', 'economy.json');

function getEconomy() {
    try {
        if (fs.existsSync(economyPath)) {
            return JSON.parse(fs.readFileSync(economyPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveEconomy(data) {
    fs.writeFileSync(economyPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Gamble GloryCoin rolling dice 1-100 (OwO style roll)')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of GloryCoin to bet')
                .setRequired(true)
                .setMinValue(10)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = getEconomy();

        if (!eco[userId] || !eco[userId].acceptedTerms) {
            const tosEmbed = new EmbedBuilder()
                .setTitle('📜 GAMBLING TERMS OF SERVICE (GLORYCOIN)')
                .setDescription('You must agree to the terms of service before using the gambling system!\n\n👇 *Click the button below to accept the terms and claim **1,000 GloryCoin** to start!*')
                .setColor(0xFEE75C);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_gambling_tos')
                    .setLabel('✅ Agree & Claim 1,000 GloryCoin')
                    .setStyle(ButtonStyle.Success)
            );
            return interaction.reply({ embeds: [tosEmbed], components: [row], ephemeral: true });
        }

        const bet = interaction.options.getInteger('amount');

        if (eco[userId].balance < bet) {
            return interaction.reply({
                content: `❌ You do not have enough GloryCoin! Your current balance is **${eco[userId].balance.toLocaleString()} GloryCoin**.`,
                ephemeral: true
            });
        }

        // Roll 1-100
        const userRoll = Math.floor(Math.random() * 100) + 1;
        const botRoll = Math.floor(Math.random() * 100) + 1;

        let payout = 0;
        let outcome = '';
        let color = 0x57F287;

        if (userRoll > botRoll) {
            if (userRoll === 100) {
                payout = bet * 4; // Jackpot 4x
                outcome = `🌟 **JACKPOT (100 Roll)!** Won 4x payout (\`+${payout.toLocaleString()} GloryCoin\`)!`;
                eco[userId].balance += payout;
            } else {
                payout = bet; // Win 1x
                outcome = `🎉 **WON!** Your roll beat the bot (\`+${payout.toLocaleString()} GloryCoin\`).`;
                eco[userId].balance += payout;
            }
        } else if (userRoll === botRoll) {
            outcome = `🤝 **TIE!** No GloryCoin lost.`;
            color = 0xFEE75C;
        } else {
            payout = bet;
            outcome = `😢 **LOST!** Bot roll was higher (\`-${payout.toLocaleString()} GloryCoin\`).`;
            eco[userId].balance -= payout;
            color = 0xED4245;
        }

        saveEconomy(eco);

        const embed = new EmbedBuilder()
            .setTitle('🎲 Dice Roll Game (1-100)')
            .setColor(color)
            .addFields(
                { name: '👤 Your Roll', value: `\`🎲 ${userRoll}\``, inline: true },
                { name: '🤖 Bot Roll', value: `\`🤖 ${botRoll}\``, inline: true },
                { name: '💵 Bet Amount', value: `\`${bet.toLocaleString()} GloryCoin\``, inline: true },
                { name: '🏆 Outcome', value: outcome, inline: false },
                { name: '💰 Current Wallet', value: `\`${eco[userId].balance.toLocaleString()} GloryCoin\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
