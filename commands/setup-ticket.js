const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ticketConfigPath = path.join(__dirname, '..', 'ticketConfig.json');

function getTicketConfig() {
    try {
        if (fs.existsSync(ticketConfigPath)) {
            return JSON.parse(fs.readFileSync(ticketConfigPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveTicketConfig(data) {
    fs.writeFileSync(ticketConfigPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Cấu hình hệ thống Ticket song ngữ (VI/EN) / Setup bilingual ticket system')
        .addChannelOption(option =>
            option.setName('danh_muc')
                .setDescription('Danh mục (Category) chứa kênh ticket / Category for ticket channels')
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role_staff')
                .setDescription('Role nhân viên hỗ trợ / Support staff role')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh! / You need Administrator or Manage Channels permission!', ephemeral: true });
        }

        const category = interaction.options.getChannel('danh_muc');
        const staffRole = interaction.options.getRole('role_staff');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = getTicketConfig();
            config[interaction.guild.id] = {
                categoryId: category.id,
                staffRoleId: staffRole.id
            };
            saveTicketConfig(config);

            const embed = new EmbedBuilder()
                .setTitle('🎫 **CẤU HÌNH TICKET THÀNH CÔNG / TICKET SETUP SUCCESSFUL**')
                .setDescription(`🇻🇳 Đã thiết lập hệ thống Ticket song ngữ cho server thành công!\n🇺🇸 Successfully configured bilingual ticket system for the server!\n\n📂 **Danh mục / Category:** ${category.name}\n🛡️ **Role hỗ trợ / Staff Role:** ${staffRole}\n\n*Bây giờ bạn có thể dùng lệnh \`/tao-gui-ticket\` để gửi bảng điều khiển ticket ra kênh! / Now use \`/tao-gui-ticket\` to send the ticket panel!*`)
                .setColor(0x5865F2)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi setup ticket:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi lưu cấu hình ticket. / Error saving ticket configuration.' });
        }
    },
};
