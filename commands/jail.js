const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const jailConfigPath = path.join(__dirname, '..', 'jailConfig.json');
const jailedUsersPath = path.join(__dirname, '..', 'jailedUsers.json');

function getConfig() {
    try {
        if (fs.existsSync(jailConfigPath)) {
            return JSON.parse(fs.readFileSync(jailConfigPath, 'utf8'));
        }
    } catch (e) {}
    return null;
}

function getJailedUsers() {
    try {
        if (fs.existsSync(jailedUsersPath)) {
            return JSON.parse(fs.readFileSync(jailedUsersPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveJailedUsers(data) {
    fs.writeFileSync(jailedUsersPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jail')
        .setDescription('Nhốt thành viên vào phòng Jail (Ẩn mọi kênh khác, chỉ thấy kênh phạt)')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Thành viên cần nhốt tù')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Lý do bị nhốt tù')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý thành viên để sử dụng lệnh này!', ephemeral: true });
        }

        const config = getConfig();
        if (!config) {
            return interaction.reply({ content: '❌ Server chưa được thiết lập phòng Jail! Hãy chạy lệnh `/create-jail-room` trước.', ephemeral: true });
        }

        const targetMember = interaction.options.getMember('member');
        const reason = interaction.options.getString('reason') || 'Không có lý do';

        if (!targetMember) {
            return interaction.reply({ content: '❌ Không tìm thấy thành viên này!', ephemeral: true });
        }

        if (targetMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Không thể nhốt tù một Quản trị viên (Admin)!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const jailRole = guild.roles.cache.get(config.jailRoleId);
            const jailChannel = guild.channels.cache.get(config.jailChannelId);

            if (!jailRole || !jailChannel) {
                return interaction.editReply({ content: '❌ Không tìm thấy Role hoặc Kênh Jail cấu hình. Hãy chạy lại `/create-jail-room`.' });
            }

            const jailCategory = jailChannel.parent;

            // Đảm bảo kênh jail luôn cho phép role Jailed nhìn thấy & chat
            await jailChannel.permissionOverwrites.edit(jailRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
            });
            if (jailCategory) {
                await jailCategory.permissionOverwrites.edit(jailRole, {
                    ViewChannel: true,
                });
            }

            // Khóa tất cả các kênh khác trên server đối với role Jailed
            const channels = guild.channels.cache.values();
            for (const channel of channels) {
                if (channel.id !== jailChannel.id && channel.id !== jailCategory?.id) {
                    try {
                        await channel.permissionOverwrites.edit(jailRole, {
                            ViewChannel: false,
                            SendMessages: false,
                        });
                    } catch (e) {}
                }
            }

            const currentRoleIds = targetMember.roles.cache
                .filter(r => r.id !== guild.id && r.id !== jailRole.id)
                .map(r => r.id);

            const jailedData = getJailedUsers();
            jailedData[targetMember.id] = currentRoleIds;
            saveJailedUsers(jailedData);

            await targetMember.roles.set([jailRole.id], `Bị nhốt tù bởi ${interaction.user.tag}. Lý do: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('🚨 **CÓ TỘI PHẠM VỪA VÀO TÙ!** 🚨')
                .setDescription(`Ê tụi mày ơi, nhìn mặt tên tội phạm <@${targetMember.id}> này xem! 😂\n\n📌 **Lý do nhập kho:** *${reason}*\n⚖️ **Người áp giải:** ${interaction.user}\n\n*Hắn đã bị tước quyền xem mọi kênh khác, chỉ còn được chat ở căn phòng này thôi!*`)
                .setColor(0xE74C3C)
                .setThumbnail(targetMember.user.displayAvatarURL())
                .setTimestamp();

            await jailChannel.send({ content: '@everyone', embeds: [embed] });

            await interaction.editReply({ content: `✅ Đã tống giam thành công **${targetMember.user.tag}** vào phòng Jail!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thực hiện lệnh nhốt tù.' });
        }
    },
};
