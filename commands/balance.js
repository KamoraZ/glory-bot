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
        .setName('balance')
        .setDescription('Kiểm tra số dư ví xu cá cược của bạn hoặc người khác')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Thành viên cần xem ví (để trống nếu xem chính mình)')
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const eco = getEconomy();

        if (!eco[target.id]) {
            eco[target.id] = { balance: 1000, lastDaily: 0 };
            saveEconomy(eco);
        }

        const userEco = eco[target.id];

        const embed = new EmbedBuilder()
            .setTitle(`💰 Ví Xu Cá Cược • ${target.username}`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(0xF1C40F)
            .addFields(
                { name: '🪙 Số dư hiện tại', value: `\`${userEco.balance.toLocaleString()} xu\``, inline: true },
                { name: '🎁 Trạng thái Daily', value: userEco.lastDaily && Date.now() - userEco.lastDaily < 86400000 ? `<t:${Math.floor((userEco.lastDaily + 86400000) / 1000)}:R>` : '✨ **Có thể nhận ngay!** (Dùng `/daily`)', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Gambling System • Gõ /daily để nhận xu miễn phí mỗi ngày' });

        await interaction.reply({ embeds: [embed] });
    },
};
