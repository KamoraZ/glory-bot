const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
        .setDescription('Xem bảng xếp hạng top đại gia giàu nhất server (Leaderboard)'),
    async execute(interaction) {
        const eco = getEconomy();
        const entries = Object.entries(eco);

        if (entries.length === 0) {
            return interaction.reply({
                content: '📊 Bảng xếp hạng hiện đang trống!',
                ephemeral: true
            });
        }

        // Sort descending by balance
        entries.sort((a, b) => b[1].balance - a[1].balance);
        const top10 = entries.slice(0, 10);

        let desc = '';
        for (let i = 0; i < top10.length; i++) {
            const [userId, data] = top10[i];
            const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
            desc += `${medal} <@${userId}> — \`${data.balance.toLocaleString()} xu\`\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Bảng Xếp Hạng Đại Gia (Rich Leaderboard)')
            .setDescription(desc || 'Chưa có dữ liệu.')
            .setColor(0xF1C40F)
            .setTimestamp()
            .setFooter({ text: 'Gambling System • Top Richest Players' });

        await interaction.reply({ embeds: [embed] });
    },
};
