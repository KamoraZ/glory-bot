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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balltop')
        .setDescription('View the server rich leaderboard (Top GloryCoin holders)'),
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

        const entries = Object.entries(eco);

        if (entries.length === 0) {
            return interaction.reply({
                content: '📊 Leaderboard is currently empty!',
                ephemeral: true
            });
        }

        // Sort descending by balance
        entries.sort((a, b) => b[1].balance - a[1].balance);
        const top10 = entries.slice(0, 10);

        let desc = '';
        for (let i = 0; i < top10.length; i++) {
            const [uid, data] = top10[i];
            const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
            desc += `${medal} <@${uid}> — \`${data.balance.toLocaleString()} GloryCoin\`\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 GloryCoin Rich Leaderboard')
            .setDescription(desc || 'No data available.')
            .setColor(0xF1C40F)
            .setTimestamp()
            .setFooter({ text: 'GloryCoin Gambling System • Top Richest Players' });

        await interaction.reply({ embeds: [embed] });
    },
};
