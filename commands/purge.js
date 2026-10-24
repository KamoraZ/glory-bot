const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Xóa nhanh số lượng tin nhắn chỉ định (từ 1 đến 100)')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số lượng tin nhắn cần xóa (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Tin nhắn để sử dụng lệnh này!', ephemeral: true });
        }

        const amount = interaction.options.getInteger('amount');

        await interaction.deferReply({ ephemeral: true });

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.editReply({ content: `✅ Đã xóa thành công ${deleted.size} tin nhắn trong kênh này!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi xóa tin nhắn (Lưu ý: Không thể xóa tin nhắn cũ hơn 14 ngày).' });
        }
    },
};
