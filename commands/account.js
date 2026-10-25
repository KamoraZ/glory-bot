const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Kiểm tra thông tin tài khoản Minecraft từ hệ thống Render (glory-server)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Thành viên cần kiểm tra (để trống nếu kiểm tra chính mình)')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const renderApiUrl = process.env.RENDER_API_URL || process.env.FRIEND_RENDER_URL || 'https://glory-server.onrender.com';

        await interaction.deferReply({ ephemeral: true });

        try {
            const response = await fetch(`${renderApiUrl}/api/account/${targetUser.id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    return interaction.editReply({
                        content: `❌ **${targetUser.tag}** chưa liên kết tài khoản Minecraft trên hệ thống Render (\`${renderApiUrl}\`)!`
                    });
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const accountData = await response.json();
            if (!accountData || !accountData.mcUsername) {
                return interaction.editReply({
                    content: `❌ Không tìm thấy thông tin tài khoản Minecraft cho **${targetUser.tag}**.`
                });
            }

            const isPremium = accountData.accountType && accountData.accountType.toLowerCase().includes('premium');
            const hasKey = accountData.hasGloryKey;
            const title = accountData.roleTitle || 'Member';

            const embed = new EmbedBuilder()
                .setTitle(`🛡️ Thông Tin Tài Khoản • ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setColor(isPremium ? 0x57F287 : 0xFEE75C)
                .addFields(
                    { name: '🎮 Tên Nhân Vật (MC Username)', value: `\`${accountData.mcUsername}\``, inline: true },
                    { name: '🔐 Loại Tài Khoản', value: isPremium ? '🟩 **Microsoft Premium**' : '🟨 **Crack / Offline**', inline: true },
                    { name: '👑 Chức Danh (Title)', value: `\`${title}\``, inline: true },
                    { name: '🔑 Glory Key Status', value: hasKey ? '✨ **Có bản quyền (Key Active)**' : '❌ Không có Key', inline: true },
                    { name: '📅 Thời Gian Liên Kết', value: accountData.linkedAt ? `<t:${Math.floor(new Date(accountData.linkedAt).getTime() / 1000)}:R>` : 'N/A', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Glory Client & Render Integration System' });

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('Lỗi khi gọi Render API account:', err);
            await interaction.editReply({
                content: `⚠️ Không thể kết nối đến máy chủ Render (\`${renderApiUrl}\`). Vui lòng thử lại sau.`
            });
        }
    },
};
