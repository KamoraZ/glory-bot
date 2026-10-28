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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fix-ticket')
        .setDescription('Cấp quyền xem và nhắn tin cho role STAFF vào toàn bộ các kênh ticket hiện có / Grant staff permissions to all ticket channels'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Kênh!', ephemeral: true });
        }

        const config = getTicketConfig();
        const guildConfig = config[interaction.guild.id];

        if (!guildConfig || !guildConfig.staffRoleId) {
            return interaction.reply({ content: '❌ Hệ thống ticket chưa được cấu hình role STAFF trên server này! Vui lòng chạy `/setup-ticket` trước.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const staffRoleId = guildConfig.staffRoleId;
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
                content: `✅ Đã cấp quyền thành công cho role <@&${staffRoleId}> vào **${updatedCount}** kênh ticket và danh mục!`
            });
        } catch (error) {
            console.error('Lỗi khi fix quyền ticket:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi cập nhật quyền ticket.' });
        }
    },
};
