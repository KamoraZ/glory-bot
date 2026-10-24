const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const autoRolePath = path.join(__dirname, '..', 'autoRoleConfig.json');

function getAutoRoleConfig() {
    try {
        if (fs.existsSync(autoRolePath)) {
            return JSON.parse(fs.readFileSync(autoRolePath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveAutoRoleConfig(data) {
    fs.writeFileSync(autoRolePath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-role')
        .setDescription('Cấu hình tự động cấp role mặc định cho thành viên mới khi vào server')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role tự động cấp (để trống hoặc chọn role bất kỳ)')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Role để sử dụng lệnh này!', ephemeral: true });
        }

        const role = interaction.options.getRole('role');

        await interaction.deferReply({ ephemeral: true });

        try {
            const config = getAutoRoleConfig();
            config[interaction.guild.id] = {
                roleId: role.id,
                roleName: role.name
            };
            saveAutoRoleConfig(config);

            const embed = new EmbedBuilder()
                .setTitle('🛡️ **CẤU HÌNH AUTO-ROLE THÀNH CÔNG**')
                .setDescription(`🇻🇳 Từ nay bất kỳ thành viên mới nào tham gia server (hoặc out ra vào lại) sẽ tự động được cấp role ${role}!\n\n📌 **Role tự động:** ${role.name}`)
                .setColor(0x2ECC71)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi lưu cấu hình auto-role:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi lưu cấu hình auto-role.' });
        }
    },
};
