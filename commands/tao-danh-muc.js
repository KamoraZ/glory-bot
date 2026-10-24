const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-danh-muc')
        .setDescription('Tạo một danh mục (Category) mới trên server')
        .addStringOption(option =>
            option.setName('tên')
                .setDescription('Tên của danh mục')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const name = interaction.options.getString('tên');
        await interaction.deferReply({ ephemeral: true });

        try {
            const category = await interaction.guild.channels.create({
                name: name,
                type: ChannelType.GuildCategory,
            });
            await interaction.editReply({ content: `✅ Đã tạo thành công danh mục **${category.name}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo danh mục.' });
        }
    },
};
