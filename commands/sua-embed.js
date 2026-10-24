const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sua_embed')
        .setDescription('Chỉnh sửa trực tiếp Embed của bot bằng Message ID (Phong cách Discohook)')
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh chứa tin nhắn embed cần sửa')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message_id')
                .setDescription('ID của tin nhắn chứa embed cần sửa')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tieu_de')
                .setDescription('Tiêu đề mới cho embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('noi_dung')
                .setDescription('Nội dung mới cho embed')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('anh_url')
                .setDescription('Link hình ảnh mới (tuỳ chọn)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Tin nhắn để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');
        const messageId = interaction.options.getString('message_id');
        const newTitle = interaction.options.getString('tieu_de');
        const newContent = interaction.options.getString('noi_dung');
        const newImageUrl = interaction.options.getString('anh_url');

        await interaction.deferReply({ ephemeral: true });

        try {
            const targetMessage = await channel.messages.fetch(messageId).catch(() => null);
            if (!targetMessage) {
                return interaction.editReply({ content: '❌ Không tìm thấy tin nhắn với ID này trong kênh đã chọn!' });
            }

            const oldEmbed = targetMessage.embeds[0];
            if (!oldEmbed) {
                return interaction.editReply({ content: '❌ Tin nhắn này không chứa Embed nào để chỉnh sửa!' });
            }

            const formattedContent = newContent.split('\n').map(line => line.trim() ? `> ${line}` : '>').join('\n');

            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setTitle(oldEmbed.title ? oldEmbed.title.replace(/\|.*$/, `|  ${newTitle.toUpperCase()}`) : newTitle.toUpperCase())
                .setDescription(`### 📌 **THÔNG BÁO ĐÃ CHỈNH SỬA (DISCOHOOK)**\n\n${formattedContent}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);

            if (newImageUrl) {
                updatedEmbed.setImage(newImageUrl);
            }

            await targetMessage.edit({ embeds: [updatedEmbed], components: targetMessage.components });
            await interaction.editReply({ content: `✅ Đã chỉnh sửa embed thành công tại tin nhắn ID \`${messageId}\`!` });
        } catch (error) {
            console.error('Lỗi khi sua_embed:', error);
            await interaction.editReply({ content: `❌ Đã xảy ra lỗi khi chỉnh sửa embed: ${error.message}` });
        }
    },
};
