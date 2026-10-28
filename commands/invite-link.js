const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite-link')
        .setDescription('Tạo link lời mời (Invite) cá nhân được hệ thống ghi nhận người mời'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Tạo Lời Mời để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const invite = await interaction.channel.createInvite({
                maxAge: 0, // Không hết hạn
                maxUses: 0,
                unique: true,
                reason: `Được tạo bởi ${interaction.user.tag} (${interaction.user.id})`
            });

            const embed = new EmbedBuilder()
                .setTitle('🔗 **TẠO LINK MỜI THÀNH CÔNG**')
                .setDescription(`Đã tạo link mời cá nhân của bạn tại kênh ${interaction.channel}:\n\`https://discord.gg/${invite.code}\`\n\n📌 *Mỗi khi có người tham gia server qua link này, hệ thống sẽ tự động tính 1 invite cho bạn và gửi thông báo lên kênh cấu hình!*`)
                .setColor(0x2ECC71)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo link lời mời.' });
        }
    },
};
