const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Tạo mã xác thực 6 ký tự (cả chữ và số) cho Glory Client - Ahihi'),
    async execute(interaction) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const embed = new EmbedBuilder()
            .setTitle('🔑 Mã Xác Thực Glory Client (6 Ký Tự Alphanumeric)')
            .setDescription(`Mã xác thực của bạn là: \`\`\`fix\n${code}\`\`\`\n*Ahihi chúc bạn thành công!*`)
            .setColor(0x57F287)
            .setTimestamp()
            .setFooter({ text: 'Glory Client Verification System' });

        await interaction.reply({ embeds: [embed], ephemeral: false });
    },
};
