const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backup')
        .setDescription('Tạo bản backup lịch sử tin nhắn thủ công / Manually backup message history'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên! / You need Administrator permission!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const backupDir = path.join(__dirname, '..', 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const guild = interaction.guild;
            const backupData = {
                guildId: guild.id,
                guildName: guild.name,
                timestamp: new Date().toISOString(),
                channels: {}
            };

            for (const [channelId, channel] of guild.channels.cache) {
                if (channel.isTextBased()) {
                    try {
                        const messages = await channel.messages.fetch({ limit: 100 });
                        backupData.channels[channelId] = {
                            name: channel.name,
                            messages: messages.map(m => ({
                                id: m.id,
                                author: m.author.tag,
                                content: m.content,
                                createdAt: m.createdAt
                            }))
                        };
                    } catch (e) {}
                }
            }

            const filePath = path.join(backupDir, `manual-backup-${guild.id}-${timestamp}.json`);
            fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

            const embed = new EmbedBuilder()
                .setTitle('💾 **BACKUP THÀNH CÔNG / BACKUP SUCCESSFUL**')
                .setDescription(`🇻🇳 Đã lưu lịch sử tin nhắn của server vào file backup thành công!\n🇺🇸 Server message history has been successfully backed up!`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi backup:', error);
            await interaction.editReply({ content: '❌ Lỗi khi thực hiện backup. / Error performing backup.' });
        }
    }
};
