const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Cấm chat (Timeout) một thành viên')
        .addUserOption(option =>
            option.setName('thanh_vien')
                .setDescription('Thành viên cần mute')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('thoi_gian')
                .setDescription('Thời gian mute (tính bằng phút)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320))
        .addStringOption(option =>
            option.setName('ly_do')
                .setDescription('Lý do mute')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Thành viên để sử dụng lệnh này!', ephemeral: true });
        }

        const targetUser = interaction.options.getMember('thanh_vien');
        const minutes = interaction.options.getInteger('thoi_gian');
        const reason = interaction.options.getString('ly_do') || 'Không có lý do';

        if (!targetUser) {
            return interaction.reply({ content: '❌ Không tìm thấy thành viên này trên server!', ephemeral: true });
        }

        if (!targetUser.moderatable) {
            return interaction.reply({ content: '❌ Bot không thể mute thành viên này (họ có quyền cao hơn hoặc bằng bot)!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const durationMs = minutes * 60 * 1000;
            await targetUser.timeout(durationMs, reason);
            await interaction.editReply({ content: `✅ Đã mute thành công **${targetUser.user.tag}** trong **${minutes} phút**. Lý do: *${reason}*` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thực hiện lệnh mute.' });
        }
    },
};
