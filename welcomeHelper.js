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

function formatText(text, member) {
    if (!text) return '';
    return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.tag)
        .replace(/{server}/g, member.guild.name)
        .replace(/{memberCount}/g, member.guild.memberCount);
}

async function sendWelcomeMessage(member) {
    try {
        const config = getWelcomeConfig();
        const guildConfig = config[member.guild.id];
        let mainChannel = null;

        if (guildConfig && guildConfig.mainChannelId) {
            mainChannel = member.guild.channels.cache.get(guildConfig.mainChannelId) || await member.guild.channels.fetch(guildConfig.mainChannelId).catch(() => null);
        }

        if (!mainChannel) {
            mainChannel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(member.guild.members.me)?.has(PermissionsBitField.Flags.SendMessages));
        }

        if (!mainChannel) {
            console.log(`[WELCOME INFO] Server ${member.guild.name} (${member.guild.id}) chưa cấu hình welcome và không tìm thấy system channel.`);
            return false;
        }

        const secondaryChannel = guildConfig && guildConfig.secondaryChannelId ? (member.guild.channels.cache.get(guildConfig.secondaryChannelId) || await member.guild.channels.fetch(guildConfig.secondaryChannelId).catch(() => null)) : null;

        // Banner Image logic: Custom imageUrl -> Server Banner -> Default aesthetic wallpaper
        const bannerImage = (guildConfig && guildConfig.imageUrl) || member.guild.bannerURL({ size: 1024 }) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';

        // Custom or Default Title & Description
        const defaultTitle = `🌟 CHÀO MỪNG ĐẾN VỚI ${member.guild.name}! 🎉`;
        const defaultDescription = `Chào mừng thành viên tuyệt vời <@${member.id}> (**${member.user.tag}**) đã đặt chân đến thiên đường của chúng ta! 🚀\n\n───────────────────────────────────────\n📊 **Thứ tự gia nhập:** \`#${member.guild.memberCount}\`\n📅 **Tài khoản tạo:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n🛡️ **Trạng thái bảo mật:** \`Đã xác thực an toàn\` ✨\n\n*Hãy chuẩn bị tinh thần trải nghiệm những điều tuyệt vời nhất tại đây nhé!*`;

        const titleText = guildConfig && guildConfig.customTitle ? formatText(guildConfig.customTitle, member) : defaultTitle;
        const descriptionText = guildConfig && guildConfig.customDescription ? formatText(guildConfig.customDescription, member) : defaultDescription;

        // 1. Main Welcome Embed (Thông báo chính cực xịn)
        const mainEmbed = new EmbedBuilder()
            .setTitle(titleText)
            .setDescription(descriptionText)
            .setColor(0x00FFFF)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setImage(bannerImage)
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

        // Build Buttons (Link to specific channels if configured, otherwise fallback to interaction customId)
        const rulesButton = guildConfig.rulesChannelId
            ? new ButtonBuilder().setLabel('📜 Nội quy').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${guildConfig.rulesChannelId}`)
            : new ButtonBuilder().setCustomId('welcome_rules').setLabel('📜 Nội quy').setStyle(ButtonStyle.Secondary);

        const rolesButton = guildConfig.rolesChannelId
            ? new ButtonBuilder().setLabel('🎭 Nhận Role').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${guildConfig.rolesChannelId}`)
            : new ButtonBuilder().setCustomId('welcome_roles').setLabel('🎭 Nhận Role').setStyle(ButtonStyle.Secondary);

        const chatButton = guildConfig.chatChannelId
            ? new ButtonBuilder().setLabel('💬 Trò chuyện').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${guildConfig.chatChannelId}`)
            : new ButtonBuilder().setCustomId('welcome_chat').setLabel('💬 Trò chuyện').setStyle(ButtonStyle.Secondary);

        const ticketButton = guildConfig.ticketChannelId
            ? new ButtonBuilder().setLabel('🎫 Hỗ trợ').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${member.guild.id}/${guildConfig.ticketChannelId}`)
            : new ButtonBuilder().setCustomId('welcome_ticket').setLabel('🎫 Hỗ trợ').setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(rulesButton, rolesButton, chatButton, ticketButton);

        // Send Main Welcome to Main Channel
        await mainChannel.send({ content: `🎉 Chào mừng ${member} xuất hiện tại server!`, embeds: [mainEmbed] });

        // Send Secondary Welcome (to secondary channel if set, otherwise to main channel)
        const targetSecondaryChannel = secondaryChannel || mainChannel;
        await targetSecondaryChannel.send({ embeds: [secondaryEmbed], components: [row] });

        console.log(`[WELCOME SUCCESS] Đã gửi thành công welcome cho ${member.user.tag} tại server ${member.guild.name}`);
        return true;
    } catch (error) {
        console.error('[WELCOME ERROR] Lỗi khi gửi welcome message:', error);
        return false;
    }
}

module.exports = { sendWelcomeMessage };
