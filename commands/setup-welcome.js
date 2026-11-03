const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const welcomeConfigPath = path.join(__dirname, '..', 'welcomeConfig.json');

function getWelcomeConfig() {
    try {
        if (fs.existsSync(welcomeConfigPath)) {
            return JSON.parse(fs.readFileSync(welcomeConfigPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveWelcomeConfig(data) {
    fs.writeFileSync(welcomeConfigPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Cấu hình Ultimate Welcome (Kênh, Banner, Custom Embed chính & Nút chuyển kênh)')
        .addChannelOption(option =>
            option.setName('kenh_chinh')
                .setDescription('Kênh chính gửi thông báo chào mừng (Main Welcome Channel)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kenh_phu')
                .setDescription('Kênh phụ hướng dẫn / Welcome phụ [Tùy chọn]')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('anh_banner')
                .setDescription('Link ảnh banner / hình nền welcome tuỳ chỉnh [Tùy chọn]')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('tieu_de_chinh')
                .setDescription('Tiêu đề embed chính tuỳ chỉnh (Hỗ trợ emoji server) [Tùy chọn]')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('noi_dung_chinh')
                .setDescription('Nội dung embed chính tuỳ chỉnh (Dùng {user}, {server}, {memberCount}) [Tùy chọn]')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kenh_noi_quy')
                .setDescription('Kênh Nội quy để nút bấm chuyển thẳng tới [Tùy chọn]')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kenh_nhan_role')
                .setDescription('Kênh Nhận Role để nút bấm chuyển thẳng tới [Tùy chọn]')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kenh_chat')
                .setDescription('Kênh Trò chuyện chung để nút bấm chuyển thẳng tới [Tùy chọn]')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kenh_ho_tro')
                .setDescription('Kênh Hỗ trợ / Ticket để nút bấm chuyển thẳng tới [Tùy chọn]')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh để cấu hình hệ thống welcome!', ephemeral: true });
        }

        const mainChannel = interaction.options.getChannel('kenh_chinh');
        const secondaryChannel = interaction.options.getChannel('kenh_phu');
        const customImageUrl = interaction.options.getString('anh_banner');
        const customTitle = interaction.options.getString('tieu_de_chinh');
        const customDesc = interaction.options.getString('noi_dung_chinh');
        const rulesChannel = interaction.options.getChannel('kenh_noi_quy');
        const rolesChannel = interaction.options.getChannel('kenh_nhan_role');
        const chatChannel = interaction.options.getChannel('kenh_chat');
        const supportChannel = interaction.options.getChannel('kenh_ho_tro');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = getWelcomeConfig();
            const existing = config[interaction.guild.id] || {};
            config[interaction.guild.id] = {
                mainChannelId: mainChannel.id,
                secondaryChannelId: secondaryChannel ? secondaryChannel.id : existing.secondaryChannelId || null,
                imageUrl: customImageUrl || existing.imageUrl || null,
                customTitle: customTitle || existing.customTitle || null,
                customDescription: customDesc || existing.customDescription || null,
                rulesChannelId: rulesChannel ? rulesChannel.id : existing.rulesChannelId || null,
                rolesChannelId: rolesChannel ? rolesChannel.id : existing.rolesChannelId || null,
                chatChannelId: chatChannel ? chatChannel.id : existing.chatChannelId || null,
                ticketChannelId: supportChannel ? supportChannel.id : existing.ticketChannelId || null
            };
            saveWelcomeConfig(config);

            const embed = new EmbedBuilder()
                .setTitle('🌟 **CẤU HÌNH ULTIMATE WELCOME THÀNH CÔNG**')
                .setDescription(`✅ Đã thiết lập hệ thống chào mừng đỉnh cao cho server!\n\n📌 **Kênh chính:** ${mainChannel}\n🧭 **Kênh phụ:** ${secondaryChannel ? secondaryChannel : '*(Dùng chung)*'}\n🖼️ **Banner:** ${customImageUrl ? '[Xem ảnh]' : '*(Mặc định)*'}\n📝 **Custom Tiêu đề:** ${customTitle ? `\`${customTitle}\`` : '*(Mặc định)*'}\n💬 **Custom Nội dung:** ${customDesc ? '✅ Đã thiết lập' : '*(Mặc định)*'}\n\n🔗 **Nút chuyển kênh trực tiếp:**\n• 📜 Nội quy: ${rulesChannel ? rulesChannel : '*(Chưa set)*'}\n• 🎭 Nhận Role: ${rolesChannel ? rolesChannel : '*(Chưa set)*'}\n• 💬 Trò chuyện: ${chatChannel ? chatChannel : '*(Chưa set)*'}\n• 🎫 Hỗ trợ: ${supportChannel ? supportChannel : '*(Chưa set)*'}\n\n*Dùng lệnh \`/test-welcome\` để kiểm tra ngay!*`)
                .setColor(0x00FFFF)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lưu cấu hình welcome:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi lưu cấu hình welcome.' });
        }
    },
};
