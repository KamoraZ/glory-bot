const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const trapFile = path.join(__dirname, '..', 'trapChannels.json');

function getTrapChannels() {
    try {
        if (fs.existsSync(trapFile)) {
            return JSON.parse(fs.readFileSync(trapFile, 'utf8'));
        }
    } catch (e) {}
    return [];
}

function saveTrapChannels(channels) {
    fs.writeFileSync(trapFile, JSON.stringify(channels, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-trap-raid')
        .setDescription('Tạo kênh bẫy Raid (Honeypot): Ai không phải admin gửi tin nhắn vào sẽ bị BAN vĩnh viễn ngay lập tức'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const channel = await interaction.guild.channels.create({
                name: 'trap-raid',
                type: ChannelType.GuildText,
                topic: 'Kênh cấm chat tuyệt đối. Bất kỳ ai gửi tin nhắn vào đây sẽ bị BAN vĩnh viễn!',
            });

            const embed = new EmbedBuilder()
                .setTitle('⚠️ **KHU VỰC NGUY HIỂM - TRAP RAID** ⚠️')
                .setDescription('**CẢNH BÁO:** Đây là kênh bẫy tự động bảo vệ server.\nBất kỳ thành viên nào (không phải Admin) gửi tin nhắn, link hoặc hình ảnh vào đây sẽ bị **BAN VĨNH VIỄN** lập tức!')
                .setColor(0xE74C3C);

            await channel.send({ embeds: [embed] });

            const trapChannels = getTrapChannels();
            if (!trapChannels.includes(channel.id)) {
                trapChannels.push(channel.id);
                saveTrapChannels(trapChannels);
            }

            await interaction.editReply({ content: `✅ Đã thiết lập thành công kênh bẫy raid ${channel}!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh bẫy raid.' });
        }
    },
};
