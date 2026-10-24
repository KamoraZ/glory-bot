const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-channel')
        .setDescription('Xóa một kênh chỉ định trên server')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Kênh cần xóa')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('channel');

        await interaction.deferReply({ ephemeral: true });

        try {
            const channelName = channel.name;
            await channel.delete();
            await interaction.editReply({ content: `✅ Đã xóa thành công kênh **${channelName}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi xóa kênh. Vui lòng kiểm tra quyền của bot!' });
        }
    },
};
