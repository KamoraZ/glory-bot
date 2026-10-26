const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCode } = require('../glory-verify-api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Tao ma xac thuc 6 ky tu cho Glory Client'),
    async execute(interaction) {
        const { code, expiresAt } = createCode(interaction.user);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔑 Mã Xác Thực Glory Client')
            .setDescription(`Mã xác thực 6 ký tự của bạn:\n\`\`\`${code}\`\`\`\n⏰ Hết hạn: <t:${Math.floor(expiresAt / 1000)}:R>\n\nHãy nhập mã này vào Glory Client để liên kết tài khoản!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
