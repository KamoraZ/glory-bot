const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite-link')
        .setDescription('Tạo link lời mời (Invite) cá nhân được hệ thống ghi nhận người mời'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Tạo Lời Mời để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const invite = await interaction.channel.createInvite({
                maxAge: 0, // Không hết hạn
                maxUses: 0, // Không giới hạn số lần dùng
                unique: true,
                reason: `Được tạo bởi ${interaction.user.tag} (${interaction.user.id})`
            });

            // Cập nhật ngay lập tức cache invite của bot để hệ thống tracker nhận diện
            if (interaction.client.invites) {
                const freshInvites = await interaction.guild.invites.fetch().catch(() => null);
                if (freshInvites) {
                    interaction.client.invites.set(interaction.guild.id, freshInvites);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔗 **TẠO LINK MỜI CÁ NHÂN THÀNH CÔNG**')
                .setDescription(`Đã tạo link mời cá nhân của bạn tại kênh ${interaction.channel}:\n\`https://discord.gg/${invite.code}\`\n\n📌 *Khi có thành viên gia nhập qua link này, hệ thống sẽ tính 1 invite cho bạn và ghi nhận trên kênh thông báo!*`)
                .setColor(0x2ECC71)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi tạo invite link:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo link lời mời.' });
        }
    },
};
