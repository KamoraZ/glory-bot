const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-gui-ticket')
        .setDescription('Tạo bảng điều khiển Ticket song ngữ kèm banner')
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh hiển thị bảng ticket')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề chính')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('phu_de')
                .setDescription('Nội dung/phụ đề tiếng Việt & tiếng Anh')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');
        const title = interaction.options.getString('tieu_de');
        const subtitle = interaction.options.getString('phu_de');

        await interaction.deferReply({ ephemeral: true });

        try {
            const bannerPath = path.join(__dirname, '..', 'ticket-banner.jpg');
            const files = [];
            let imageRef = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

            if (fs.existsSync(bannerPath)) {
                files.push(new AttachmentBuilder(bannerPath, { name: 'ticket-banner.jpg' }));
                imageRef = 'attachment://ticket-banner.jpg';
            }

            const footerOptions = { text: `${interaction.guild.name} • Bilingual Support (VI/EN)` };
            const guildIcon = interaction.guild.iconURL();
            if (guildIcon) {
                footerOptions.iconURL = guildIcon;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🎫 ${title} | Bilingual Support System`)
                .setDescription(`${subtitle}\n\n🇻🇳 *Bấm nút bên dưới để mở yêu cầu hỗ trợ riêng tư với Ban Quản Trị.*\n🇺🇸 *Click the button below to open a private support ticket with staff.*`)
                .setColor(0x5865F2)
                .setImage(imageRef)
                .setTimestamp()
                .setFooter(footerOptions);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create')
                        .setLabel('Tạo Ticket / Create Ticket')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎫'),
                    new ButtonBuilder()
                        .setCustomId('ticket_faq')
                        .setLabel('Hướng dẫn / FAQ')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❓')
                );

            await channel.send({ embeds: [embed], components: [row], files: files });
            await interaction.editReply({ content: `✅ Đã gửi bảng GUI Ticket song ngữ thành công đến kênh ${channel}!` });
        } catch (error) {
            console.error('Lỗi khi tạo GUI ticket:', error);
            await interaction.editReply({ content: `❌ Đã xảy ra lỗi: ${error.message}` });
        }
    },
};
