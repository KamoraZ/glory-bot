const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const welcomeConfigPath = path.join(__dirname, 'welcomeConfig.json');

function getWelcomeConfig() {
    try {
        if (fs.existsSync(welcomeConfigPath)) {
            return JSON.parse(fs.readFileSync(welcomeConfigPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

async function sendWelcomeMessage(member) {
    try {
        const config = getWelcomeConfig();
        const guildConfig = config[member.guild.id];
        if (!guildConfig || !guildConfig.mainChannelId) return false;

        const mainChannel = member.guild.channels.cache.get(guildConfig.mainChannelId) || await member.guild.channels.fetch(guildConfig.mainChannelId).catch(() => null);
        if (!mainChannel) return false;

        const secondaryChannel = guildConfig.secondaryChannelId ? (member.guild.channels.cache.get(guildConfig.secondaryChannelId) || await member.guild.channels.fetch(guildConfig.secondaryChannelId).catch(() => null)) : null;

        // 1. Main Welcome Embed (Thông báo chính cực xịn)
        const mainEmbed = new EmbedBuilder()
            .setTitle(`🌟 CHÀO MỪNG ĐẾN VỚI ${member.guild.name}! 🎉`)
            .setDescription(`Chào mừng thành viên tuyệt vời <@${member.id}> (**${member.user.tag}**) đã đặt chân đến thiên đường của chúng ta! 🚀\n\n───────────────────────────────────────\n📊 **Thứ tự gia nhập:** \`#${member.guild.memberCount}\`\n📅 **Tài khoản tạo:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n🛡️ **Trạng thái bảo mật:** \`Đã xác thực an toàn\` ✨\n\n*Hãy chuẩn bị tinh thần trải nghiệm những điều tuyệt vời nhất tại đây nhé!*`)
            .setColor(0x00FFFF)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setImage(member.guild.bannerURL({ size: 1024 }) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop')
            .setFooter({ text: `${member.guild.name} • Thành viên thứ #${member.guild.memberCount}`, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        // 2. Secondary Welcome Embed (Welcome phụ & Hướng dẫn nhanh)
        const secondaryEmbed = new EmbedBuilder()
            .setTitle(`🧭 WELCOME PHỤ • BẢNG HƯỚNG DẪN KHỞI ĐẦU`)
            .setDescription(`Để có chuyến hành trình mượt mà và trọn vẹn nhất tại **${member.guild.name}**, bạn hãy ghé qua các trạm dừng chân quan trọng sau đây:\n\n• 📜 **Nội quy server:** Đọc kỹ quy định chung để tránh vi phạm.\n• 🎭 **Nhận role sở thích:** Tự chọn game, thông báo và màu sắc.\n• 💬 **Kênh trò chuyện:** Giao lưu, kết bạn cùng mọi người.\n• 🎫 **Hỗ trợ / Ticket:** Mở phiếu khi cần BQT trợ giúp khẩn cấp.\n\n👇 *Bấm vào các nút bên dưới để di chuyển nhanh đến các kênh!*`)
            .setColor(0x5865F2)
            .setThumbnail(member.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Hệ thống Ultimate Welcome Engine`, iconURL: member.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        // Interactive Buttons (Add các nút bấm để di chuyển kênh)
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('welcome_rules')
                    .setLabel('📜 Nội quy')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('welcome_roles')
                    .setLabel('🎭 Nhận Role')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('welcome_chat')
                    .setLabel('💬 Trò chuyện')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('welcome_ticket')
                    .setLabel('🎫 Hỗ trợ')
                    .setStyle(ButtonStyle.Primary)
            );

        // Send Main Welcome to Main Channel
        await mainChannel.send({ content: `🎉 Chào mừng ${member} xuất hiện tại server!`, embeds: [mainEmbed] });

        // Send Secondary Welcome (to secondary channel if set, otherwise to main channel)
        const targetSecondaryChannel = secondaryChannel || mainChannel;
        await targetSecondaryChannel.send({ embeds: [secondaryEmbed], components: [row] });

        return true;
    } catch (error) {
        console.error('Lỗi khi gửi welcome message:', error);
        return false;
    }
}

module.exports = { sendWelcomeMessage };
