const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-webhook')
        .setDescription('Tạo tự động một Discord Webhook cho kênh chỉ định để liên kết các mạng xã hội')
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh muốn tạo Webhook')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ten_webhook')
                .setDescription('Tên hiển thị của Webhook (mặc định: Social Bot)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageWebhooks)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Webhooks để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');
        const name = interaction.options.getString('ten_webhook') || 'Social Bot';

        await interaction.deferReply({ ephemeral: true });

        try {
            const webhook = await channel.createWebhook({
                name: name,
                avatar: 'https://i.imgur.com/AfFp7pu.png',
                reason: `Tạo bởi ${interaction.user.tag} để đồng bộ mạng xã hội`,
            });

            await interaction.editReply({
                content: `✅ **Đã tạo Webhook thành công cho kênh ${channel}!**\n\n🔗 **Webhook URL:**\n\`${webhook.url}\`\n\n*(Lưu ý: Bạn có thể copy URL này dán vào các dịch vụ tự động như Zapier, IFTTT, RSS.app hoặc dùng lệnh \`/send-webhook\` để tự động đăng bài!)*`
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo Webhook.' });
        }
    },
};
