const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chi-dinh-role')
        .setDescription('Chỉ định 1 role được chat ở kênh, các role khác bị cấm / Allow only a specific role to chat')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role được phép chat trong kênh / Role allowed to chat')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh cần áp dụng (mặc định kênh hiện tại) / Target channel (default current)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh! / You need Administrator or Manage Channels permission!', ephemeral: true });
        }

        const targetRole = interaction.options.getRole('role');
        const targetChannel = interaction.options.getChannel('kenh') || interaction.channel;

        await interaction.deferReply({ ephemeral: true });

        try {
            // 1. Cấm @everyone gửi tin nhắn ở kênh này
            await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false,
                ViewChannel: true
            });

            // 2. Cho phép role được chọn gửi tin nhắn ở kênh này
            await targetChannel.permissionOverwrites.edit(targetRole, {
                SendMessages: true,
                ViewChannel: true
            });

            // 3. Đảm bảo bot vẫn có quyền gửi tin nhắn
            await targetChannel.permissionOverwrites.edit(interaction.client.user, {
                SendMessages: true,
                ViewChannel: true,
                ManageChannels: true
            });

            const embed = new EmbedBuilder()
                .setTitle('🛡️ **PHÂN QUYỀN KÊNH THÀNH CÔNG / CHANNEL PERMISSION UPDATED**')
                .setDescription(`🇻🇳 Kênh ${targetChannel} đã được cấu hình chỉ cho phép role **${targetRole.name}** được gửi tin nhắn! Các thành viên không có role này sẽ bị cấm chat.\n\n🇺🇸 Channel ${targetChannel} has been restricted to allow only the **${targetRole.name}** role to send messages!`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi phân quyền role cho kênh:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi cấu hình quyền cho kênh. / Error configuring channel permissions.' });
        }
    },
};
