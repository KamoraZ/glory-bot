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
        .setDescription('Cấu hình hệ thống Welcome cực xịn (Thông báo chính + Welcome phụ & Nút bấm)')
        .addChannelOption(option =>
            option.setName('kenh_chinh')
                .setDescription('Kênh chính gửi thông báo chào mừng (Main Welcome Channel)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kenh_phu')
                .setDescription('Kênh phụ hướng dẫn / Welcome phụ (Secondary Welcome / Guidance Channel) [Tùy chọn]')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh để cấu hình hệ thống welcome!', ephemeral: true });
        }

        const mainChannel = interaction.options.getChannel('kenh_chinh');
        const secondaryChannel = interaction.options.getChannel('kenh_phu');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = getWelcomeConfig();
            config[interaction.guild.id] = {
                mainChannelId: mainChannel.id,
                secondaryChannelId: secondaryChannel ? secondaryChannel.id : null
            };
            saveWelcomeConfig(config);

            const embed = new EmbedBuilder()
                .setTitle('🌟 **CẤU HÌNH ULTIMATE WELCOME THÀNH CÔNG**')
                .setDescription(`✅ Đã thiết lập hệ thống chào mừng đỉnh cao cho server!\n\n📌 **Kênh thông báo chính:** ${mainChannel}\n🧭 **Kênh welcome phụ / hướng dẫn:** ${secondaryChannel ? secondaryChannel : '*(Dùng chung kênh chính)*'}\n\n✨ Hệ thống sẽ tự động gửi:\n• **Embed 1 (Thông báo chính):** Chào mừng thành viên kèm avatar, số thứ tự thành viên, thông tin tài khoản và người mời.\n• **Embed 2 (Welcome phụ):** Bảng hướng dẫn nhanh cùng các nút bấm tương tác (Nội quy, Nhận role, Trò chuyện, Hỗ trợ).\n\n*Bạn có thể dùng lệnh \`/test-welcome\` để thử nghiệm ngay lập tức!*`)
                .setColor(0x00FFFF)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lưu cấu hình welcome:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi lưu cấu hình welcome.' });
        }
    },
};
