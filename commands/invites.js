const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const inviteStatsPath = path.join(__dirname, '..', 'inviteStats.json');

function getInviteStats() {
    try {
        if (fs.existsSync(inviteStatsPath)) {
            return JSON.parse(fs.readFileSync(inviteStatsPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Kiểm tra số lượng invite của bạn hoặc thành viên khác')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Thành viên cần kiểm tra (để trống là xem của bạn)')
                .setRequired(false)),
    async execute(interaction) {
        const target = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        const stats = getInviteStats();
        const guildStats = stats[guildId] || {};
        const userStats = guildStats[target.id] || { total: 0, regular: 0, bonus: 0, left: 0 };

        const embed = new EmbedBuilder()
            .setTitle(`📊 THỐNG KÊ INVITE - ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '📥 Tổng số invite', value: `**${userStats.total || 0}**`, inline: true },
                { name: '✅ Hợp lệ (Regular)', value: `**${userStats.regular || 0}**`, inline: true },
                { name: '🎁 Thêm (Bonus)', value: `**${userStats.bonus || 0}**`, inline: true },
                { name: '❌ Đã rời (Left)', value: `**${userStats.left || 0}**`, inline: true }
            )
            .setColor(0x9B59B6)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
