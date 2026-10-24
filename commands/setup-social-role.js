const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-social-role')
        .setDescription('Tự động tạo role "Social Media" trên server để cấp quyền quản lý bài viết'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Role để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            let role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === 'social media');
            
            if (!role) {
                role = await interaction.guild.roles.create({
                    name: 'Social Media',
                    color: 0x1877F2,
                    reason: 'Role cấp phép quản lý mạng xã hội và webhook',
                    permissions: []
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ **THIẾT LẬP ROLE SOCIAL MEDIA**')
                .setDescription(`Đã sẵn sàng role **${role}** trên server!\n\n💡 **Cách dùng:** Giao role này cho những thành viên bạn muốn cấp quyền sử dụng các lệnh mạng xã hội (\`/post-mxh\`, \`/test-webhook\`, \`/send-webhook\`) mà không cần cấp quyền Quản trị viên.`)
                .setColor(0x1877F2)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi tạo social role:', error);
            await interaction.editReply({ content: '❌ Không thể tạo role. Hãy kiểm tra xem Bot có quyền **Manage Roles** (Quản lý Role) và role của Bot nằm ở vị trí cao hơn không!' });
        }
    },
};
