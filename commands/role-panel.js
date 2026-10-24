const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-panel')
        .setDescription('Tạo bảng nhận role tương tác giao diện siêu xịn (bấm nút để nhận/bỏ role)')
        // 1. Các option bắt buộc (Required options trước)
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh gửi bảng role')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề bảng role')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role_1')
                .setDescription('Role thứ nhất')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('nhãn_1')
                .setDescription('Tên hiển thị trên nút 1')
                .setRequired(true))
        // 2. Các option không bắt buộc (Optional options sau)
        .addStringOption(option =>
            option.setName('mo_ta')
                .setDescription('Mô tả hướng dẫn chung cho bảng role')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role_2')
                .setDescription('Role thứ hai (tuỳ chọn)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('nhãn_2')
                .setDescription('Tên hiển thị trên nút 2')
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('role_3')
                .setDescription('Role thứ ba (tuỳ chọn)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('nhãn_3')
                .setDescription('Tên hiển thị trên nút 3')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Role để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');
        const title = interaction.options.getString('tieu_de');
        const customDesc = interaction.options.getString('mo_ta') || '🇻🇳 Nhấn vào các nút bên dưới để tự động nhận hoặc gỡ các role thông báo / danh hiệu tương ứng trên server.';
        
        const rolesData = [
            { role: interaction.options.getRole('role_1'), label: interaction.options.getString('nhãn_1'), style: ButtonStyle.Primary, emoji: '✨' },
        ];

        const r2 = interaction.options.getRole('role_2');
        const l2 = interaction.options.getString('nhãn_2');
        if (r2 && l2) rolesData.push({ role: r2, label: l2, style: ButtonStyle.Success, emoji: '🔔' });

        const r3 = interaction.options.getRole('role_3');
        const l3 = interaction.options.getString('nhãn_3');
        if (r3 && l3) rolesData.push({ role: r3, label: l3, style: ButtonStyle.Secondary, emoji: '🛡️' });

        await interaction.deferReply({ ephemeral: true });

        try {
            let desc = `${customDesc}\n\n`;
            rolesData.forEach((item, index) => {
                desc += `> ${item.emoji} **${item.label}** ➔ Nhận ngay ${item.role}\n`;
            });
            desc += `\n*💡 Mẹo: Bấm lại vào nút một lần nữa nếu bạn muốn gỡ role ra.*`;

            const embed = new EmbedBuilder()
                .setTitle(`🎯 **${title.toUpperCase()}**`)
                .setDescription(desc)
                .setColor(0x5865F2)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
                .setTimestamp()
                .setFooter({ 
                    text: `${interaction.guild.name} • Interactive Self-Role System`, 
                    iconURL: interaction.client.user.displayAvatarURL() 
                });

            const row = new ActionRowBuilder();
            rolesData.forEach((item, index) => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`role_claim_${item.role.id}`)
                        .setLabel(item.label)
                        .setStyle(item.style)
                        .setEmoji(item.emoji)
                );
            });

            await channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✅ Đã tạo bảng tương tác nhận role giao diện xịn xò thành công tại kênh ${channel}!` });
        } catch (error) {
            console.error('Lỗi khi tạo role panel:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo bảng role. Hãy đảm bảo bot có quyền Quản lý Role và thứ tự role của bot nằm cao hơn các role cần cấp.' });
        }
    },
};
