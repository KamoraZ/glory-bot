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

function saveEconomy(data) {
    fs.writeFileSync(economyPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận xu thưởng miễn phí mỗi ngày (24 giờ/lần)'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = getEconomy();

        if (!eco[userId]) {
            eco[userId] = { balance: 1000, lastDaily: 0 };
        }

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        const lastDaily = eco[userId].lastDaily || 0;

        if (now - lastDaily < cooldown) {
            const nextTime = Math.floor((lastDaily + cooldown) / 1000);
            return interaction.reply({
                content: `⏳ Bạn đã nhận xu hôm nay rồi! Hãy quay lại sau <t:${nextTime}:R>.`,
                ephemeral: true
            });
        }

        const reward = Math.floor(Math.random() * 3000) + 2000; // 2000 - 5000 xu
        eco[userId].balance += reward;
        eco[userId].lastDaily = now;
        saveEconomy(eco);

        const embed = new EmbedBuilder()
            .setTitle('🎁 Điểm Danh Hàng Ngày (Daily Reward)')
            .setDescription(`Chúc mừng **${interaction.user.username}** đã nhận thành công **+${reward.toLocaleString()} xu**!`)
            .addFields({ name: '🪙 Số dư mới', value: `\`${eco[userId].balance.toLocaleString()} xu\``, inline: true })
            .setColor(0x57F287)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
