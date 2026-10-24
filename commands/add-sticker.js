const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-sticker')
        .setDescription('Thêm sticker mới vào server từ URL hình ảnh')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Link URL hình ảnh sticker (.png, .json/lottie)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ten')
                .setDescription('Tên của sticker')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji_lien_quan')
                .setDescription('Emoji liên quan đến sticker (ví dụ: 😀)')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Emoji/Sticker để sử dụng lệnh này!', ephemeral: true });
        }

        const url = interaction.options.getString('url');
        const name = interaction.options.getString('ten');
        const tags = interaction.options.getString('emoji_lien_quan');

        await interaction.deferReply({ ephemeral: true });

        try {
            const sticker = await interaction.guild.stickers.create({ file: url, name: name, tags: tags });
            await interaction.editReply({ content: `✅ Đã thêm thành công sticker **${sticker.name}** vào server!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thêm sticker. Vui lòng kiểm tra lại URL hoặc định dạng file.' });
        }
    },
};
