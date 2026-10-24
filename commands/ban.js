const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban (cấm vĩnh viễn) một thành viên khỏi server')
        .addUserOption(option =>
            option.setName('thanh_vien')
                .setDescription('Thành viên cần ban')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ly_do')
                .setDescription('Lý do ban')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Ban Thành viên để sử dụng lệnh này!', ephemeral: true });
        }

        const targetUser = interaction.options.getMember('thanh_vien');
        const reason = interaction.options.getString('ly_do') || 'Không có lý do';

        if (!targetUser) {
            return interaction.reply({ content: '❌ Không tìm thấy thành viên này trên server!', ephemeral: true });
        }

        if (!targetUser.bannable) {
            return interaction.reply({ content: '❌ Bot không thể ban thành viên này (họ có quyền cao hơn hoặc bằng bot)!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await targetUser.ban({ reason });
            await interaction.editReply({ content: `✅ Đã ban thành công **${targetUser.user.tag}** khỏi server. Lý do: *${reason}*` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thực hiện lệnh ban.' });
        }
    },
};
