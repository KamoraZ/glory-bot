const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const stickyFile = path.join(__dirname, '..', 'stickyConfig.json');

function getStickyConfig() {
    try {
        if (fs.existsSync(stickyFile)) {
            return JSON.parse(fs.readFileSync(stickyFile, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveStickyConfig(config) {
    fs.writeFileSync(stickyFile, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Quản lý ghi chú dính (sticky note) ở cuối kênh chat')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Thiết lập ghi chú dính cho kênh (ghi gì hiển thị y chang thế đó)')
                .addStringOption(option =>
                    option.setName('noi_dung')
                        .setDescription('Nội dung bạn muốn ghi chú dính')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('kenh')
                        .setDescription('Kênh áp dụng (mặc định kênh hiện tại)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Xóa ghi chú dính của kênh')
                .addChannelOption(option =>
                    option.setName('kenh')
                        .setDescription('Kênh cần xóa (mặc định kênh hiện tại)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false))),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Kênh để sử dụng lệnh này!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('kenh') || interaction.channel;
        const config = getStickyConfig();

        if (subcommand === 'set') {
            const content = interaction.options.getString('noi_dung');

            await interaction.deferReply({ ephemeral: true });

            try {
                if (config[channel.id] && config[channel.id].lastMessageId) {
                    try {
                        const oldMsg = await channel.messages.fetch(config[channel.id].lastMessageId);
                        if (oldMsg) await oldMsg.delete();
                    } catch (e) {}
                }

                // Gửi nội dung nguyên bản (không qua embed/gui)
                const sentMessage = await channel.send({ content: content });

                config[channel.id] = {
                    content,
                    lastMessageId: sentMessage.id
                };
                saveStickyConfig(config);

                await interaction.editReply({ content: `✅ Đã thiết lập ghi chú dính thành công cho kênh ${channel}!` });
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thiết lập ghi chú dính.' });
            }
        } else if (subcommand === 'remove') {
            await interaction.deferReply({ ephemeral: true });

            try {
                if (config[channel.id]) {
                    if (config[channel.id].lastMessageId) {
                        try {
                            const oldMsg = await channel.messages.fetch(config[channel.id].lastMessageId);
                            if (oldMsg) await oldMsg.delete();
                        } catch (e) {}
                    }
                    delete config[channel.id];
                    saveStickyConfig(config);
                }

                await interaction.editReply({ content: `✅ Đã xóa ghi chú dính của kênh ${channel}!` });
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi xóa ghi chú dính.' });
            }
        }
    },
};
