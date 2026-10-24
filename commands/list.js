const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list')
        .setDescription('Liệt kê danh sách toàn bộ các lệnh Slash Commands hiện có của bot'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const commands = interaction.client.commands;
            let commandList = `Tổng số lệnh đang hoạt động: **${commands.size} lệnh**\n\n`;

            commands.forEach((cmd, name) => {
                const desc = cmd.data.description || 'Không có mô tả';
                commandList += `• **/${name}** — *${desc}*\n`;
            });

            if (commandList.length > 4096) {
                commandList = commandList.substring(0, 4000) + '\n... (Danh sách quá dài)';
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📋 **DANH SÁCH LỆNH SLASH COMMANDS**')
                .setDescription(commandList)
                .setTimestamp()
                .setFooter({ text: 'Command Registry • Social Media Hub' });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi thực thi lệnh list:', error);
            await interaction.editReply({ content: `❌ Đã xảy ra lỗi khi liệt kê lệnh: ${error.message}` });
        }
    },
};
