const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-invite')
        .setDescription('Tạo link lời mời (Invite) cho kênh hiện tại'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Tạo Lời Mời để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const invite = await interaction.channel.createInvite({
                maxAge: 86400,
                maxUses: 0,
                reason: `Được tạo bởi ${interaction.user.tag}`,
            });

            await interaction.editReply({ content: `✅ Link lời mời tham gia kênh ${interaction.channel} của bạn (có hiệu lực 24h):\nhttps://discord.gg/${invite.code}` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo link lời mời.' });
        }
    },
};
