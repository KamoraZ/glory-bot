const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const inviteConfigPath = path.join(__dirname, '..', 'inviteConfig.json');

function getInviteConfig() {
    try {
        if (fs.existsSync(inviteConfigPath)) {
            return JSON.parse(fs.readFileSync(inviteConfigPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveInviteConfig(data) {
    fs.writeFileSync(inviteConfigPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-invite')
        .setDescription('Cấu hình kênh gửi thông báo khi có thành viên tham gia qua link mời')
        .addChannelOption(option =>
            option.setName('kenh')
                .setDescription('Kênh nhận thông báo invite')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kenh');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = getInviteConfig();
            config[interaction.guild.id] = {
                channelId: channel.id
            };
            saveInviteConfig(config);

            const embed = new EmbedBuilder()
                .setTitle('⚙️ **CẤU HÌNH KÊNH INVITE THÀNH CÔNG**')
                .setDescription(`✅ Đã thiết lập kênh thông báo invite thành công tại ${channel}!\n\nTừ bây giờ mọi thông báo người tham gia và số lượng invite sẽ được gửi vào đây.`)
                .setColor(0x3498DB)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lưu cấu hình invite:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi lưu cấu hình invite.' });
        }
    },
};
