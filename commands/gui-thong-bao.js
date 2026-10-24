const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gui-thong-bao')
        .setDescription('Gửi bản thông báo thiết kế hiện đại, sang trọng tích hợp chỉnh sửa như Discohook')
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh muốn gửi thông báo')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('loai')
                .setDescription('Loại thông báo')
                .setRequired(true)
                .addChoices(
                    { name: '📢 Thông báo chung (General)', value: 'general' },
                    { name: '⚠️ Cảnh báo quan trọng (Warning)', value: 'warning' },
                    { name: '🎉 Sự kiện (Event)', value: 'event' },
                    { name: '🚀 Cập nhật hệ thống (Update)', value: 'update' }
                ))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề thông báo')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('noi_dung')
                .setDescription('Nội dung chi tiết thông báo')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('anh_url')
                .setDescription('Link hình ảnh/banner đính kèm (tuỳ chọn)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Tin nhắn để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');
        const type = interaction.options.getString('loai');
        const title = interaction.options.getString('tieu_de');
        const content = interaction.options.getString('noi_dung');
        const imageUrl = interaction.options.getString('anh_url');

        await interaction.deferReply({ ephemeral: true });

        try {
            let color = 0x5865F2; // Blurple hiện đại
            let icon = '📢';
            let typeName = 'THÔNG BÁO CHUNG';

            if (type === 'warning') {
                color = 0xED4245; // Đỏ Discord hiện đại
                icon = '⚠️';
                typeName = 'CẢNH BÁO QUAN TRỌNG';
            } else if (type === 'event') {
                color = 0xFEE75C; // Vàng Discord hiện đại
                icon = '🎉';
                typeName = 'SỰ KIỆN ĐẶC BIỆT';
            } else if (type === 'update') {
                color = 0x57F287; // Xanh lá Discord hiện đại
                icon = '🚀';
                typeName = 'CẬP NHẬT HỆ THỐNG';
            }

            const formattedContent = content.split('\n').map(line => line.trim() ? `> ${line}` : '>').join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${icon}  |  ${title.toUpperCase()}`)
                .setDescription(`### 📌 **${typeName}**\n\n${formattedContent}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
                .setColor(color)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
                .setTimestamp()
                .setFooter({ 
                    text: `Phát hành bởi ${interaction.user.tag} • ${interaction.guild.name} (Discohook Mode)`, 
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                });

            if (imageUrl) {
                embed.setImage(imageUrl);
            }

            const editButton = new ButtonBuilder()
                .setCustomId('discohook_edit_embed')
                .setLabel('✏️ Chỉnh sửa Embed (Discohook)')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(editButton);

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✅ Đã gửi thông báo kèm nút Discohook Edit đến kênh ${channel}!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi gửi thông báo.' });
        }
    },
};
