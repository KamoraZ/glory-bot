const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, '..', 'changelogConfig.json');
const autoRolePath = path.join(__dirname, '..', 'autoRoleConfig.json');
const ticketPath = path.join(__dirname, '..', 'ticketConfig.json');
const socialPath = path.join(__dirname, '..', 'socialConfig.json');
const stickyPath = path.join(__dirname, '..', 'stickyConfig.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Quản lý cấu hình bot và thiết lập kênh Changelog / Cập nhật')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('Xem toàn bộ cấu hình hiện tại của bot trên server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('changelog')
                .setDescription('Thiết lập kênh nhận thông báo Changelog / Cập nhật hệ thống')
                .addChannelOption(option =>
                    option.setName('kenh')
                        .setDescription('Kênh nhận changelog')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Server để sử dụng lệnh này!', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        await interaction.deferReply({ ephemeral: true });

        if (subcommand === 'view') {
            try {
                let changelogChannelId = 'Chưa cấu hình';
                try {
                    if (fs.existsSync(changelogPath)) {
                        const cl = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
                        if (cl[guildId]) changelogChannelId = `<#${cl[guildId].channelId}>`;
                    }
                } catch (e) {}

                let autoRoleName = 'Chưa cấu hình';
                try {
                    if (fs.existsSync(autoRolePath)) {
                        const ar = JSON.parse(fs.readFileSync(autoRolePath, 'utf8'));
                        if (ar[guildId]) autoRoleName = `<@&${ar[guildId].roleId}>`;
                    }
                } catch (e) {}

                let ticketStatus = 'Chưa cấu hình';
                try {
                    if (fs.existsSync(ticketPath)) {
                        const tk = JSON.parse(fs.readFileSync(ticketPath, 'utf8'));
                        if (tk[guildId]) ticketStatus = `Đã bật (Category: <#${tk[guildId].categoryId}>)`;
                    }
                } catch (e) {}

                let stickyCount = 0;
                try {
                    if (fs.existsSync(stickyPath)) {
                        const st = JSON.parse(fs.readFileSync(stickyPath, 'utf8'));
                        stickyCount = Object.keys(st).length;
                    }
                } catch (e) {}

                const embed = new EmbedBuilder()
                    .setTitle(`⚙️ **CẤU HÌNH BOT TRÊN SERVER**`)
                    .setDescription(`Danh sách trạng thái các tính năng và module đang hoạt động trên **${interaction.guild.name}**:`)
                    .addFields(
                        { name: '📢 Kênh Changelog / Cập nhật', value: changelogChannelId, inline: false },
                        { name: '🛡️ Auto-Role (Cấp khi vào)', value: autoRoleName, inline: false },
                        { name: '🎫 Hệ thống Ticket', value: ticketStatus, inline: false },
                        { name: '📌 Sticky Notes (Ghi chú dính)', value: `Đang hoạt động trên **${stickyCount}** kênh`, inline: false }
                    )
                    .setColor(0x3498DB)
                    .setTimestamp()
                    .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('Lỗi khi xem config:', err);
                await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tải cấu hình.' });
            }
        } else if (subcommand === 'changelog') {
            const channel = interaction.options.getChannel('kenh');
            try {
                let cl = {};
                if (fs.existsSync(changelogPath)) {
                    cl = JSON.parse(fs.readFileSync(changelogPath, 'utf8'));
                }
                cl[guildId] = {
                    channelId: channel.id,
                    channelName: channel.name,
                    updatedAt: new Date().toISOString()
                };
                fs.writeFileSync(changelogPath, JSON.stringify(cl, null, 2), 'utf8');

                const embed = new EmbedBuilder()
                    .setTitle('📢 **THIẾT LẬP KÊNH CHANGELOG THÀNH CÔNG**')
                    .setDescription(`Kênh ${channel} đã được chỉ định làm nơi nhận các bản tin Changelog và cập nhật tính năng mới của bot!`)
                    .setColor(0x2ECC71)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('Lỗi khi lưu changelog config:', err);
                await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi lưu cấu hình kênh changelog.' });
            }
        }
    },
};
