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
        .setName('coinflip')
        .setDescription('Gamble GloryCoin on a coin toss (Heads or Tails)')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of GloryCoin to bet')
                .setRequired(true)
                .setMinValue(10))
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Choose coin side')
                .setRequired(true)
                .addChoices(
                    { name: '🪙 Heads (Sấp)', value: 'heads' },
                    { name: '🌕 Tails (Ngửa)', value: 'tails' }
                )),
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
        const choice = interaction.options.getString('choice');

        if (eco[userId].balance < bet) {
            return interaction.reply({
                content: `❌ You do not have enough GloryCoin! Your current balance is **${eco[userId].balance.toLocaleString()} GloryCoin**.`,
                ephemeral: true
            });
        }

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const won = (result === choice);

        if (won) {
            eco[userId].balance += bet;
        } else {
            eco[userId].balance -= bet;
        }
        saveEconomy(eco);

        const resultName = result === 'heads' ? '🪙 Heads' : '🌕 Tails';
        const choiceName = choice === 'heads' ? '🪙 Heads' : '🌕 Tails';

        const embed = new EmbedBuilder()
            .setTitle('🪙 Coinflip Game')
            .setColor(won ? 0x57F287 : 0xED4245)
            .addFields(
                { name: '🎯 Your Choice', value: choiceName, inline: true },
                { name: '🎲 Result', value: resultName, inline: true },
                { name: '💵 Bet Amount', value: `\`${bet.toLocaleString()} GloryCoin\``, inline: true },
                { name: '🏆 Outcome', value: won ? `🎉 **WON!** You gained \`+${bet.toLocaleString()} GloryCoin\`` : `😢 **LOST!** You lost \`-${bet.toLocaleString()} GloryCoin\``, inline: false },
                { name: '💰 Current Wallet', value: `\`${eco[userId].balance.toLocaleString()} GloryCoin\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
