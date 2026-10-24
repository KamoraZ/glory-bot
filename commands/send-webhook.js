const { SlashCommandBuilder, PermissionsBitField, WebhookClient, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-webhook')
        .setDescription('Gửi một bài viết/thông báo qua link Discord Webhook')
        .addStringOption(option =>
            option.setName('webhook_url')
                .setDescription('Đường dẫn Discord Webhook')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề bài viết')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('noi_dung')
                .setDescription('Nội dung bài viết')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('link_bai_viet')
                .setDescription('Đường link bài viết (nếu có)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('anh_url')
                .setDescription('Link hình ảnh đính kèm (nếu có)')
                .setRequired(false)),
    async execute(interaction) {
        const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            interaction.member.roles.cache.some(r => r.name.toLowerCase() === 'social media');

        if (!hasPermission) {
            return interaction.reply({ content: '❌ Bạn cần là Quản trị viên hoặc có role **Social Media** để sử dụng lệnh này!', ephemeral: true });
        }

        const webhookUrl = interaction.options.getString('webhook_url');
        const title = interaction.options.getString('tieu_de');
        const content = interaction.options.getString('noi_dung');
        const postUrl = interaction.options.getString('link_bai_viet');
        const imageUrl = interaction.options.getString('anh_url');

        await interaction.deferReply({ ephemeral: true });

        try {
            const webhookClient = new WebhookClient({ url: webhookUrl });

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(content)
                .setColor(0x00A8FF)
                .setTimestamp()
                .setFooter({ text: `Được gửi bởi ${interaction.user.tag}` });

            if (postUrl) {
                embed.setURL(postUrl);
            }
            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            await webhookClient.send({
                embeds: [embed],
            });

            await interaction.editReply({ content: '✅ Đã gửi bài viết qua Webhook thành công!' });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Không thể gửi qua Webhook. Vui lòng kiểm tra lại tính hợp lệ của Webhook URL!' });
        }
    },
};
