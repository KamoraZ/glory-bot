const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Kiểm tra thông tin tài khoản Minecraft đã liên kết từ Glory Client'),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const renderApiUrl = process.env.RENDER_API_URL || process.env.FRIEND_RENDER_URL || 'https://glory-bot-gxg5.onrender.com';

        await interaction.deferReply({ ephemeral: true });

        let accountData = null;

        // Try fetching from Render API first
        try {
            const response = await fetch(`${renderApiUrl}/api/account/${targetUser.id}`);
            if (response.ok) {
                accountData = await response.json();
            }
        } catch (e) {
            console.warn('Render API fetch failed, falling back to local storage:', e.message);
        }

        // Fallback to local linkedAccounts.json if API failed or returned 401/404
        if (!accountData || !accountData.mcUsername) {
            const linkedAccountsPath = path.join(__dirname, '..', 'linkedAccounts.json');
            try {
                if (fs.existsSync(linkedAccountsPath)) {
                    const accounts = JSON.parse(fs.readFileSync(linkedAccountsPath, 'utf8'));
                    accountData = accounts[targetUser.id];
                }
            } catch (e) {}
        }

        if (!accountData || !accountData.mcUsername) {
            return interaction.editReply({
                content: `❌ **${targetUser.tag}** chưa liên kết tài khoản Minecraft từ Glory Client!`
            });
        }

        const isPremium = accountData.accountType && accountData.accountType.toLowerCase().includes('premium');
        const hasKey = accountData.hasGloryKey;
        const title = accountData.roleTitle || 'Member';

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ Thông Tin Tài Khoản Glory Client • ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setColor(isPremium ? 0x57F287 : 0xFEE75C)
            .addFields(
                { name: '🎮 Tên Nhân Vật (MC Username)', value: `\`${accountData.mcUsername}\``, inline: true },
                { name: '🔐 Loại Tài Khoản', value: isPremium ? '🟩 **Microsoft Premium**' : '🟨 **Crack / Offline**', inline: true },
                { name: '👑 Chức Danh (Title)', value: `\`${title}\``, inline: true },
                { name: '🔑 Glory Key Status', value: hasKey ? '✨ **Có bản quyền (Key Active)**' : '❌ Không có Key', inline: true },
                { name: '📅 Thời Gian Liên Kết', value: accountData.linkedAt ? `<t:${Math.floor(new Date(accountData.linkedAt).getTime() / 1000)}:R>` : `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Glory Client & Discord Integration System' });

        await interaction.editReply({ embeds: [embed] });
    },
};
