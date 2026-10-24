const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('account')
        .setDescription('Kiểm tra thông tin tài khoản Minecraft đã liên kết từ Glory Client')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Thành viên cần kiểm tra (để trống nếu kiểm tra chính mình)')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const linkedAccountsPath = path.join(__dirname, '..', 'linkedAccounts.json');

        let accounts = {};
        try {
            if (fs.existsSync(linkedAccountsPath)) {
                accounts = JSON.parse(fs.readFileSync(linkedAccountsPath, 'utf8'));
            }
        } catch (e) {}

        const accountData = accounts[targetUser.id];

        if (!accountData) {
            return interaction.reply({
                content: `❌ **${targetUser.tag}** chưa liên kết tài khoản Minecraft từ Glory Client!`,
                ephemeral: true
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
                { name: '📅 Thời Gian Liên Kết', value: `<t:${Math.floor(new Date(accountData.linkedAt || Date.now()).getTime() / 1000)}:R>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Glory Client & Discord Integration System' });

        await interaction.reply({ embeds: [embed] });
    },
};
