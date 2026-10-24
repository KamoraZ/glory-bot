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
        .setName('unjail')
        .setDescription('Thả tự do (Unjail) cho thành viên khỏi phòng giam')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('Thành viên cần thả')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý thành viên để sử dụng lệnh này!', ephemeral: true });
        }

        const config = getConfig();
        if (!config) {
            return interaction.reply({ content: '❌ Server chưa được thiết lập phòng Jail!', ephemeral: true });
        }

        const targetMember = interaction.options.getMember('member');
        if (!targetMember) {
            return interaction.reply({ content: '❌ Không tìm thấy thành viên này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            const jailRole = guild.roles.cache.get(config.jailRoleId);
            const jailChannel = guild.channels.cache.get(config.jailChannelId);

            const jailedData = getJailedUsers();
            const previousRoleIds = jailedData[targetMember.id] || [];

            const validRoles = previousRoleIds.filter(id => guild.roles.cache.has(id));

            await targetMember.roles.set(validRoles, `Được thả tự do bởi ${interaction.user.tag}`);

            delete jailedData[targetMember.id];
            saveJailedUsers(jailedData);

            if (jailChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🕊️ **TỘI PHẠM ĐÃ ĐƯỢC ƠN XÁ - THẢ TỰ DO!** 🕊️')
                    .setDescription(`Tên tù nhân <@${targetMember.id}> đã cải tạo tốt và được ân xá bởi ${interaction.user}!\n\n*Đừng quậy nữa nhé con trai!*`)
                    .setColor(0x2ECC71)
                    .setTimestamp();

                await jailChannel.send({ embeds: [embed] }).catch(() => {});
            }

            await interaction.editReply({ content: `✅ Đã thả tự do thành công cho **${targetMember.user.tag}**!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thả tù thành viên.' });
        }
    },
};
