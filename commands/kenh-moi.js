const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kenh-moi')
        .setDescription('Tạo một kênh mới (text hoặc voice) với tên tùy chỉnh')
        .addStringOption(option =>
            option.setName('loại')
                .setDescription('Chọn loại kênh')
                .setRequired(true)
                .addChoices(
                    { name: 'Text (Kênh chat)', value: 'text' },
                    { name: 'Voice (Kênh thoại)', value: 'voice' }
                ))
        .addStringOption(option =>
            option.setName('tên_kênh')
                .setDescription('Nhập tên cho kênh mới')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const type = interaction.options.getString('loại');
        const channelName = interaction.options.getString('tên_kênh');

        await interaction.deferReply({ ephemeral: true });

        try {
            const channelType = type === 'text' ? ChannelType.GuildText : ChannelType.GuildVoice;
            const channel = await interaction.guild.channels.create({
                name: channelName,
                type: channelType,
            });

            await interaction.editReply({ content: `✅ Đã tạo thành công kênh ${type === 'text' ? 'chat' : 'thoại'} **#${channel.name}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh. Vui lòng kiểm tra tên kênh hoặc quyền của bot!' });
        }
    },
};
