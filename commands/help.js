const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hướng dẫn chi tiết hệ thống tính năng & cách vận hành bot dành cho Dev/Admin'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x00A8FF)
            .setTitle('🤖 **HỆ THỐNG BOT & TÀI LIỆU VẬN HÀNH (DEVELOPER & ADMIN GUIDE)**')
            .setDescription('Chào mừng các bạn đến với tài liệu hướng dẫn vận hành bot. Dưới đây là tổng quan các phân hệ chính và cách sử dụng:')
            .addFields(
                { 
                    name: '📢 1. Quản lý Mạng Xã Hội (`/post-mxh`)', 
                    value: '• **Chức năng**: Chia sẻ bài viết/video (Facebook, TikTok, YouTube, Instagram) kèm Embed chuẩn đẹp, nút bấm và tự động trích xuất thumbnail chuẩn.\n• **Yêu cầu**: Cần có quyền Admin hoặc role **media Ping**.\n• **Tự động hóa**: Hỗ trợ quét tự động và Webhook.' 
                },
                { 
                    name: '🎫 2. Hệ thống Ticket & Hỗ trợ (`/setup-ticket`, `/tao-gui-ticket`)', 
                    value: '• Tạo bảng tạo vé hỗ trợ riêng tư cho thành viên với giao diện nút bấm chuyên nghiệp.' 
                },
                { 
                    name: '🛡️ 3. Bảo mật & Chống Raid (`/setup-trap-raid`, `/jail`, `/ban`, `/mute`)', 
                    value: '• Chống Raid tự động (Anti-Raid), kênh bẫy Honeypot, hệ thống giam giữ (Jail room) và kiểm duyệt thành viên.' 
                },
                { 
                    name: '📌 4. Tiện ích & Giao diện (`/role-panel`, `/sticky`, `/sua_embed`, `/send-webhook`)', 
                    value: '• Tạo bảng nhận role tương tác (`/role-panel`), ghim thông điệp cuối kênh (`/sticky`), sửa embed phong cách Discohook (`/sua_embed`).' 
                },
                { 
                    name: '💾 5. Sao lưu & Quản trị (`/backup`, `/config`)', 
                    value: '• Sao lưu toàn bộ cấu trúc server, kênh, role và cấu hình hệ thống nhanh chóng.' 
                },
                { 
                    name: '🎰 6. Hệ thống Gambling & Giải trí (`/balance`, `/balltop`, `/daily`, `/latxu`, `/roll`)', 
                    value: '• **`/balance`**: Kiểm tra số dư ví xu cá cược của bản thân hoặc người khác.\n• **`/balltop`**: Xem bảng xếp hạng top 10 đại gia giàu nhất server.\n• **`/daily`**: Nhận quà điểm danh xu miễn phí mỗi 24h (2,000 - 5,000 xu).\n• **`/latxu`**: Cược xu tung đồng xu Sấp/Ngửa nhân đôi.\n• **`/roll`**: Cược xúc xắc quay số 1-100 đọ điểm với Bot (có cơ hội ăn Jackpot 4x).' 
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Developer Operations Manual • Social Media Hub' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
