const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-dien-dan')
        .setDescription('Tạo một kênh Diễn đàn (Forum) mới trên server')
        .addStringOption(option =>
            option.setName('tên')
                .setDescription('Tên của kênh diễn đàn')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const name = interaction.options.getString('tên');
        await interaction.deferReply({ ephemeral: true });

        try {
            const forum = await interaction.guild.channels.create({
                name: name,
                type: ChannelType.GuildForum,
            });
            await interaction.editReply({ content: `✅ Đã tạo thành công kênh diễn đàn **${forum.name}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh diễn đàn.' });
        }
    },
};
