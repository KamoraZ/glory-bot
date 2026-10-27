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
        .setName('latxu')
        .setDescription('Cược xu tung đồng xu (Coinflip: Sấp hoặc Ngửa)')
        .addIntegerOption(option =>
            option.setName('sotien')
                .setDescription('Số tiền cược xu')
                .setRequired(true)
                .setMinValue(10))
        .addStringOption(option =>
            option.setName('chon')
                .setDescription('Chọn mặt đồng xu')
                .setRequired(true)
                .addChoices(
                    { name: '🪙 Sấp (Heads)', value: 'sap' },
                    { name: '🌕 Ngửa (Tails)', value: 'ngua' }
                )),
    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('sotien');
        const choice = interaction.options.getString('chon');

        const eco = getEconomy();
        if (!eco[userId]) {
            eco[userId] = { balance: 1000, lastDaily: 0 };
        }

        if (eco[userId].balance < bet) {
            return interaction.reply({
                content: `❌ Bạn không đủ xu! Số dư hiện tại của bạn là **${eco[userId].balance.toLocaleString()} xu**.`,
                ephemeral: true
            });
        }

        const result = Math.random() < 0.5 ? 'sap' : 'ngua';
        const won = (result === choice);

        if (won) {
            eco[userId].balance += bet;
        } else {
            eco[userId].balance -= bet;
        }
        saveEconomy(eco);

        const resultName = result === 'sap' ? '🪙 Sấp' : '🌕 Ngửa';
        const choiceName = choice === 'sap' ? '🪙 Sấp' : '🌕 Ngửa';

        const embed = new EmbedBuilder()
            .setTitle('🪙 Trò Chơi Lật Xu (Coinflip)')
            .setColor(won ? 0x57F287 : 0xED4245)
            .addFields(
                { name: '🎯 Bạn chọn', value: choiceName, inline: true },
                { name: '🎲 Kết quả', value: resultName, inline: true },
                { name: '💵 Tiền cược', value: `\`${bet.toLocaleString()} xu\``, inline: true },
                { name: '🏆 Kết quả trận đấu', value: won ? `🎉 **THẮNG!** Nhận thêm \`+${bet.toLocaleString()} xu\`` : `😢 **THUA!** Mất \`-${bet.toLocaleString()} xu\``, inline: false },
                { name: '💰 Số dư ví hiện tại', value: `\`${eco[userId].balance.toLocaleString()} xu\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
