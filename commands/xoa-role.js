const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xoa-role')
        .setDescription('Xóa một role chỉ định trên server')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role cần xóa')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Vai trò để sử dụng lệnh này!', ephemeral: true });
        }

        const role = interaction.options.getRole('role');
        await interaction.deferReply({ ephemeral: true });

        try {
            const roleName = role.name;
            await role.delete();
            await interaction.editReply({ content: `✅ Đã xóa thành công role **${roleName}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi xóa role (Không thể xóa role cao hơn bot hoặc role hệ thống).' });
        }
    },
};
