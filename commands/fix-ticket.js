const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
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
        .setName('fix-ticket')
        .setDescription('Cấp quyền role STAFF vào toàn bộ kênh ticket hiện có')
        .addRoleOption(option =>
            option.setName('role_staff')
                .setDescription('Chọn đúng role STAFF (nếu bot nhận nhầm role khác)')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const config = getTicketConfig();
        let guildConfig = config[guild.id] || {};

        let staffRole = interaction.options.getRole('role_staff');

        if (!staffRole && guildConfig.staffRoleId) {
            staffRole = guild.roles.cache.get(guildConfig.staffRoleId);
        }

        // Auto-detect STAFF role, strictly avoiding Administrator roles
        if (!staffRole) {
            staffRole = guild.roles.cache.find(r => 
                (r.name.toLowerCase() === 'staff' || r.name.toLowerCase().includes('staff')) &&
                !r.permissions.has(PermissionsBitField.Flags.Administrator)
            );
        }

        if (!staffRole) {
            return interaction.editReply({ content: '❌ Không tìm thấy role **STAFF** hợp lệ trên server! Vui lòng chọn role_staff thủ công trong lệnh `/fix-ticket` hoặc `/setup-ticket`.' });
        }

        // Save corrected staffRoleId to config
        guildConfig.staffRoleId = staffRole.id;
        config[guild.id] = guildConfig;
        saveTicketConfig(config);

        try {
            const staffRoleId = staffRole.id;
            const categoryId = guildConfig.categoryId;

            let updatedCount = 0;

            // Find all channels in category or starting with ticket-
            const channels = guild.channels.cache.filter(c => 
                (categoryId && c.parentId === categoryId) || c.name.startsWith('ticket-')
            );

            // Also update category if present
            if (categoryId) {
                const category = guild.channels.cache.get(categoryId);
                if (category) {
                    await category.permissionOverwrites.edit(staffRoleId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    }).catch(() => {});
                }
            }

            for (const [id, channel] of channels) {
                try {
                    await channel.permissionOverwrites.edit(staffRoleId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                    updatedCount++;
                } catch (err) {
                    console.error(`Không thể cập nhật quyền cho kênh ${channel.name}:`, err);
                }
            }

            await interaction.editReply({
                content: `✅ Đã cập nhật và cấp quyền thành công cho role STAFF đúng chuẩn (${staffRole}) vào **${updatedCount}** kênh ticket và danh mục!`
            });
        } catch (error) {
            console.error('Lỗi khi fix quyền ticket:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi cập nhật quyền ticket.' });
        }
    },
};
