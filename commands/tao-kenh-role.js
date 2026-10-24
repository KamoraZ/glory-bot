const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-kenh-role')
        .setDescription('Tạo kênh chat mới và chỉ định ngay 1 role duy nhất được phép chat (các role khác bị cấm chat)')
        .addStringOption(option =>
            option.setName('tên_kênh')
                .setDescription('Tên cho kênh chat mới')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role được phép chat trong kênh này')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('danh_muc')
                .setDescription('Danh mục chứa kênh (tùy chọn)')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const channelName = interaction.options.getString('tên_kênh');
        const targetRole = interaction.options.getRole('role');
        const category = interaction.options.getChannel('danh_muc');

        await interaction.deferReply({ ephemeral: true });

        try {
            const channelOptions = {
                name: channelName,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.SendMessages],
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory]
                    },
                    {
                        id: targetRole.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
                    }
                ]
            };

            if (category) {
                channelOptions.parent = category.id;
            }

            const channel = await interaction.guild.channels.create(channelOptions);

            const embed = new EmbedBuilder()
                .setTitle('✨ **TẠO KÊNH PHÂN QUYỀN THÀNH CÔNG**')
                .setDescription(`✅ Đã tạo kênh **#${channel.name}** thành công!\n🔒 **Quy tắc:** Chỉ có thành viên mang role **${targetRole.name}** mới được phép gửi tin nhắn. Các role khác chỉ có thể xem kênh.`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi tạo kênh phân quyền role:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh phân quyền. Vui lòng kiểm tra quyền của bot!' });
        }
    },
};
