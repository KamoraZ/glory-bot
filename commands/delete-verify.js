const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-verify')
        .setDescription('Xóa liên kết xác thực Minecraft qua Render API (Chỉ Admin/Staff)')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Thành viên cần xóa verify')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const renderApiUrl = process.env.RENDER_API_URL || process.env.FRIEND_RENDER_URL || 'https://glory-server.onrender.com';

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await fetch(`${renderApiUrl}/api/delete-verify/${targetUser.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminDiscordId: interaction.user.id })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return interaction.editReply({
                        content: `❌ Thành viên ${targetUser} chưa liên kết tài khoản Minecraft nào trên hệ thống Render (\`${renderApiUrl}\`)!`
                    });
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Đã Xóa Liên Kết Verify (Render)')
                .setDescription(`Đã xóa thành công liên kết Minecraft của **${targetUser.tag}** (Tài khoản cũ: \`${result.mcUsername || 'N/A'}\`).`)
                .setColor(0xED4245)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('Lỗi khi gọi Render API delete-verify:', err);
            await interaction.editReply({
                content: `⚠️ Không thể kết nối đến máy chủ Render (\`${renderApiUrl}\`) để xóa verify. Vui lòng thử lại sau.`
            });
        }
    },
};
