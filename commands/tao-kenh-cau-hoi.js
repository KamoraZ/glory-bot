const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-kenh-cau-hoi')
        .setDescription('Tạo một kênh hỏi đáp/câu hỏi chuyên dụng')
        .addStringOption(option =>
            option.setName('tên')
                .setDescription('Tên kênh câu hỏi (mặc định: hoi-dap)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const channelName = interaction.options.getString('tên') || 'hoi-dap';
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: 'Kênh đặt câu hỏi và giải đáp thắc mắc cho thành viên',
            });

            const embed = new EmbedBuilder()
                .setTitle('❓ KÊNH HỎI ĐÁP & THẮC MẮC')
                .setDescription('Chào mừng bạn đến với kênh câu hỏi!\nHãy đặt câu hỏi của bạn tại đây để được mọi người và ban quản trị hỗ trợ giải đáp.')
                .setColor(0x3498DB)
                .setTimestamp();

            await channel.send({ embeds: [embed] });

            await interaction.editReply({ content: `✅ Đã tạo thành công kênh câu hỏi **#${channel.name}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh câu hỏi.' });
        }
    },
};
