const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { sendWelcomeMessage } = require('../welcomeHelper'); // wait, filename is welcomeHelper.js

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Kiểm tra và test ngay lập tức hệ thống Ultimate Welcome cho chính bạn!'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên để test hệ thống welcome!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const success = await sendWelcomeMessage(interaction.member);

        if (success) {
            await interaction.editReply({ content: '✅ Đã gửi thành công tin nhắn Ultimate Welcome thử nghiệm vào kênh đã cấu hình!' });
        } else {
            await interaction.editReply({ content: '❌ Chưa cấu hình kênh welcome! Vui lòng dùng lệnh `/setup-welcome` trước.' });
        }
    },
};
