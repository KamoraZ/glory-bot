const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('viet-lore')
        .setDescription('Thiết lập lore/chủ đề vĩnh viễn cho một kênh')
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh muốn thiết lập lore')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('noi_dung')
                .setDescription('Nội dung lore/chủ đề vĩnh viễn')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');
        const loreContent = interaction.options.getString('noi_dung');

        await interaction.deferReply({ ephemeral: true });

        try {
            await channel.setTopic(loreContent);

            const embed = new EmbedBuilder()
                .setTitle('📜 LORE & THÔNG TIN KÊNH')
                .setDescription(loreContent)
                .setColor(0x00AE86);

            const sentMessage = await channel.send({ embeds: [embed] });
            await sentMessage.pin().catch(() => {});

            await interaction.editReply({ content: `✅ Đã cập nhật lore vĩnh viễn thành công cho kênh ${channel}!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thiết lập lore cho kênh.' });
        }
    },
};
