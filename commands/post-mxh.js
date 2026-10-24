const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Helper to extract YouTube thumbnail automatically
function getYouTubeThumbnail(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg` : null;
}

// Helper to fetch TikTok thumbnail via TikWM API (reliable public API)
async function getTikTokThumbnail(url) {
    try {
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (res.ok) {
            const json = await res.json();
            if (json.code === 0 && json.data) {
                const cover = json.data.cover || json.data.origin_cover || json.data.wm_cover;
                if (cover) {
                    console.log('[TikWM API] Success thumbnail:', cover);
                    return cover;
                }
            }
        }
    } catch (e) {
        console.error('[TikWM API] Error:', e.message);
    }
    return null;
}

// Helper for OpenGraph meta tags (Facebook, etc.)
async function getOpenGraphImage(url) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html'
            },
            redirect: 'follow'
        });
        if (res.ok) {
            const html = await res.text();
            const match = html.match(/<meta[^>]*property=["']og:image['"][^>]*content=["']([^"']+)["'][^>]*>/i) ||
                          html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image['"][^>]*>/i);
            if (match && match[1]) {
                return match[1].replace(/&amp;/g, '&');
            }
        }
    } catch (e) {
        console.error('[OpenGraph] Error:', e.message);
    }
    return null;
}

async function getSocialThumbnail(platform, url) {
    if (platform === 'YouTube') {
        return getYouTubeThumbnail(url);
    }
    if (platform === 'TikTok') {
        const tkThumb = await getTikTokThumbnail(url);
        if (tkThumb) return tkThumb;
    }
    return await getOpenGraphImage(url);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('post-mxh')
        .setDescription('Chia sẻ bài viết MXH (FB, TikTok, YT) kèm Embed chuẩn đẹp & nút bấm')
        .addStringOption(option =>
            option.setName('nen_tang')
                .setDescription('Chọn nền tảng')
                .setRequired(true)
                .addChoices(
                    { name: '📘 Facebook', value: 'Facebook' },
                    { name: '🎵 TikTok', value: 'TikTok' },
                    { name: '▶️ YouTube', value: 'YouTube' },
                    { name: '📸 Instagram / Khác', value: 'Khác' }
                ))
        .addStringOption(option =>
            option.setName('link_bai_viet')
                .setDescription('Đường dẫn link bài viết hoặc video')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề hoặc mô tả ngắn')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('anh_url')
                .setDescription('Link ảnh/thumbnail tùy chỉnh (nếu muốn hiển thị kèm)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh muốn đăng (mặc định kênh hiện tại)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    async execute(interaction) {
        const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
            interaction.member.roles.cache.some(r => r.name.toLowerCase() === 'media ping' || r.name.toLowerCase() === 'media');

        if (!hasPermission) {
            return interaction.reply({ content: '❌ Bạn cần là Quản trị viên hoặc có role **media Ping** để sử dụng lệnh này!', ephemeral: true });
        }

        const platform = interaction.options.getString('nen_tang');
        const postLink = interaction.options.getString('link_bai_viet');
        const title = interaction.options.getString('tieu_de') || `Bài viết mới từ ${platform}!`;
        const customImageUrl = interaction.options.getString('anh_url');
        const targetChannel = interaction.options.getChannel('kenh') || interaction.channel;

        await interaction.deferReply({ ephemeral: true });

        try {
            const mediaRole = interaction.guild.roles.cache.find(r => 
                r.name.toLowerCase() === 'media ping'
            );
            const roleMention = mediaRole ? `${mediaRole}` : '';

            let icon = '📢';
            let color = 0x5865F2;
            if (platform === 'Facebook') {
                icon = '📘';
                color = 0x1877F2;
            } else if (platform === 'TikTok') {
                icon = '🎵';
                color = 0xFE2C55;
            } else if (platform === 'YouTube') {
                icon = '▶️';
                color = 0xFF0000;
            } else if (platform === 'Khác') {
                icon = '📸';
                color = 0xE1306C;
            }

            let imageUrl = customImageUrl;
            if (!imageUrl) {
                imageUrl = await getSocialThumbnail(platform, postLink);
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${icon} [${platform.toUpperCase()}] ${title}`)
                .setDescription(`> Nhấn nút bên dưới để mở và xem bài viết gốc đầy đủ trên **${platform}**.`);

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            embed.setTimestamp()
                 .setFooter({ 
                     text: `Đăng bởi ${interaction.user.tag} • Social Media Hub`, 
                     iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                 });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(`Xem bài viết ${platform}`)
                    .setStyle(ButtonStyle.Link)
                    .setURL(postLink)
                    .setEmoji(icon)
            );

            const messageContent = `${roleMention ? roleMention + ' ' : ''}📢 Có bài viết mới trên **${platform}**!`;

            await targetChannel.send({ 
                content: messageContent, 
                embeds: [embed], 
                components: [row] 
            });

            await interaction.editReply({ content: `✅ Đã chia sẻ bài viết ${platform} thành công đến kênh ${targetChannel} (kèm Embed, nút bấm & thumbnail chuẩn)!` });
        } catch (error) {
            console.error('Lỗi khi post mxh:', error);
            await interaction.editReply({ content: `❌ Đã xảy ra lỗi khi chia sẻ bài viết: ${error.message}` });
        }
    },
};
