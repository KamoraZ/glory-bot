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
        .setName('roll')
        .setDescription('Cược xúc xắc quay số 1-100 (OwO style roll)')
        .addIntegerOption(option =>
            option.setName('sotien')
                .setDescription('Số tiền cược xu')
                .setRequired(true)
                .setMinValue(10)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('sotien');

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

        // Roll 1-100
        const userRoll = Math.floor(Math.random() * 100) + 1;
        const botRoll = Math.floor(Math.random() * 100) + 1;

        let payout = 0;
        let outcome = '';
        let color = 0x57F287;

        if (userRoll > botRoll) {
            if (userRoll === 100) {
                payout = bet * 4; // Jackpot 4x
                outcome = `🌟 **JACKPOT TUYỆT ĐỈNH (100 điểm)!** Thắng gấp 4 lần (\`+${payout.toLocaleString()} xu\`)!`;
                eco[userId].balance += payout;
            } else {
                payout = bet; // Thắng 1x
                outcome = `🎉 **THẮNG!** Điểm của bạn cao hơn bot (\`+${payout.toLocaleString()} xu\`).`;
                eco[userId].balance += payout;
            }
        } else if (userRoll === botRoll) {
            outcome = `🤝 **HÒA!** Không mất xu nào.`;
            color = 0xFEE75C;
        } else {
            payout = bet;
            outcome = `😢 **THUA!** Điểm của bot cao hơn (\`-${payout.toLocaleString()} xu\`).`;
            eco[userId].balance -= payout;
            color = 0xED4245;
        }

        saveEconomy(eco);

        const embed = new EmbedBuilder()
            .setTitle('🎲 Trò Chơi Roll Xúc Xắc (1-100)')
            .setColor(color)
            .addFields(
                { name: '👤 Điểm của bạn', value: `\`🎲 ${userRoll} điểm\``, inline: true },
                { name: '🤖 Điểm của Bot', value: `\`🤖 ${botRoll} điểm\``, inline: true },
                { name: '💵 Tiền cược', value: `\`${bet.toLocaleString()} xu\``, inline: true },
                { name: '🏆 Kết quả', value: outcome, inline: false },
                { name: '💰 Số dư ví hiện tại', value: `\`${eco[userId].balance.toLocaleString()} xu\``, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
