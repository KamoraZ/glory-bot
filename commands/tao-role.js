const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-role')
        .setDescription('Tạo một Role mới với tên và mã màu tùy thích')
        .addStringOption(option =>
            option.setName('tên_role')
                .setDescription('Tên của role mới')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ma_mau')
                .setDescription('Mã màu HEX (Ví dụ: #FF0000 hoặc FF0000)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Vai trò để sử dụng lệnh này!', ephemeral: true });
        }

        const roleName = interaction.options.getString('tên_role');
        let color = interaction.options.getString('ma_mau') || '#FFFFFF';

        if (!color.startsWith('#')) {
            color = '#' + color;
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const role = await interaction.guild.roles.create({
                name: roleName,
                color: color,
                reason: `Được tạo bởi ${interaction.user.tag}`,
            });

            await interaction.editReply({ content: `✅ Đã tạo thành công role **${role.name}** với mã màu \`${color}\`!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo role. Vui lòng kiểm tra lại mã màu HEX hoặc quyền của bot!' });
        }
    },
};
