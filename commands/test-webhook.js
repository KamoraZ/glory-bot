const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const socialConfigPath = path.join(__dirname, '..', 'socialConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-webhook')
        .setDescription('Kiểm tra và giả lập gửi dữ liệu bài viết qua Social Webhook Server')
        .addStringOption(option =>
            option.setName('nen_tang')
                .setDescription('Nền tảng mạng xã hội')
                .setRequired(true)
                .addChoices(
                    { name: 'Facebook', value: 'Facebook' },
                    { name: 'TikTok', value: 'TikTok' },
                    { name: 'YouTube', value: 'YouTube' },
                    { name: 'Instagram', value: 'Instagram' }
                ))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề bài viết thử nghiệm')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('noi_dung')
                .setDescription('Nội dung chi tiết bài viết')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('link')
                .setDescription('Đường dẫn link bài viết')
                .setRequired(false)),
    async execute(interaction) {
        const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            interaction.member.roles.cache.some(r => r.name.toLowerCase() === 'social media');

        if (!hasPermission) {
            return interaction.reply({ content: '❌ Bạn cần là Quản trị viên hoặc có role **Social Media** để sử dụng lệnh này!', ephemeral: true });
        }

        const platform = interaction.options.getString('nen_tang');
        const title = interaction.options.getString('tieu_de');
        const message = interaction.options.getString('noi_dung');
        const url = interaction.options.getString('link') || 'https://example.com';

        await interaction.deferReply({ ephemeral: true });

        try {
            let config = {};
            if (fs.existsSync(socialConfigPath)) {
                config = JSON.parse(fs.readFileSync(socialConfigPath, 'utf8'));
            }

            const guildConfig = config[interaction.guild.id];
            if (!guildConfig || !guildConfig.channelId) {
                return interaction.editReply({ content: '❌ Server này chưa được cấu hình kênh nhận thông báo Social trong `socialConfig.json`!' });
            }

            const channel = interaction.client.channels.cache.get(guildConfig.channelId);
            if (!channel) {
                return interaction.editReply({ content: '❌ Không tìm thấy kênh Discord đã cấu hình trong server.' });
            }

            let color = 0x1877F2;
            let icon = '📢';
            if (platform === 'Facebook') { color = 0x1877F2; icon = '📘'; }
            else if (platform === 'TikTok') { color = 0x000000; icon = '🎵'; }
            else if (platform === 'YouTube') { color = 0xFF0000; icon = '▶️'; }
            else if (platform === 'Instagram') { color = 0xE1306C; icon = '📸'; }

            const embed = new EmbedBuilder()
                .setTitle(`${icon} [TEST - ${platform}] ${title}`)
                .setURL(url)
                .setDescription(message)
                .setColor(color)
                .setTimestamp()
                .setFooter({ text: `Kiểm tra bởi ${interaction.user.tag}` });

            await channel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Đã gửi bài viết kiểm tra (${platform}) thành công đến kênh ${channel}!` });
        } catch (error) {
            console.error('Lỗi khi test webhook:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thực hiện test webhook.' });
        }
    },
};
