const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tao-kenh-rieng')
        .setDescription('Tạo một kênh riêng tư (chỉ Admin và người tạo mới thấy được)')
        .addStringOption(option =>
            option.setName('tên')
                .setDescription('Tên của kênh riêng')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const name = interaction.options.getString('tên');
        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await interaction.guild.channels.create({
                name: name,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
                    }
                ],
            });

            await interaction.editReply({ content: `✅ Đã tạo thành công kênh riêng tư **#${channel.name}** (Chỉ bạn và Admin mới thấy được)!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh riêng tư.' });
        }
    },
};
