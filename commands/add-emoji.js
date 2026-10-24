const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-emoji')
        .setDescription('Thêm emoji mới vào server từ URL hình ảnh')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Link URL hình ảnh của emoji (.png, .jpg, .gif)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ten')
                .setDescription('Tên của emoji')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Emoji/Sticker để sử dụng lệnh này!', ephemeral: true });
        }

        const url = interaction.options.getString('url');
        const name = interaction.options.getString('ten');

        await interaction.deferReply({ ephemeral: true });

        try {
            const emoji = await interaction.guild.emojis.create({ attachment: url, name: name });
            await interaction.editReply({ content: `✅ Đã thêm thành công emoji ${emoji} (**:${emoji.name}:**) vào server!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thêm emoji. Vui lòng kiểm tra lại URL hình ảnh hoặc định dạng.' });
        }
    },
};
