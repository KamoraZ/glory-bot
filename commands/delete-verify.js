const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delete-verify')
        .setDescription('Xóa liên kết xác thực (verify) Minecraft của một thành viên (Chỉ Admin/Staff)')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Thành viên cần xóa verify')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const linkedAccountsPath = path.join(__dirname, '..', 'linkedAccounts.json');

        let accounts = {};
        try {
            if (fs.existsSync(linkedAccountsPath)) {
                accounts = JSON.parse(fs.readFileSync(linkedAccountsPath, 'utf8'));
            }
        } catch (e) {}

        if (!accounts[targetUser.id]) {
            return interaction.reply({
                content: `❌ Thành viên ${targetUser} chưa liên kết tài khoản Minecraft nào trên hệ thống!`,
                ephemeral: true
            });
        }

        const linkedData = accounts[targetUser.id];
        delete accounts[targetUser.id];
        fs.writeFileSync(linkedAccountsPath, JSON.stringify(accounts, null, 2), 'utf8');

        // Try removing verified role from member in guild
        const guild = interaction.guild;
        if (guild) {
            try {
                const member = await guild.members.fetch(targetUser.id).catch(() => null);
                if (member) {
                    const rolesToRemove = guild.roles.cache.filter(r => 
                        r.name.toLowerCase() === 'verified' || 
                        r.name.toLowerCase() === 'minecraft player' || 
                        r.name.toLowerCase() === 'administrator' ||
                        r.name.toLowerCase() === 'thành viên' ||
                        r.name.toLowerCase() === 'vip member'
                    );
                    for (const [rId, role] of rolesToRemove) {
                        if (member.roles.cache.has(rId) && !role.managed && rId !== guild.id) {
                            await member.roles.remove(role, `Admin ${interaction.user.tag} xóa verify`).catch(() => {});
                        }
                    }
                }
            } catch (err) {}
        }

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Đã Xóa Liên Kết Verify')
            .setDescription(`Đã xóa thành công liên kết Minecraft của **${targetUser.tag}** (Tài khoản cũ: \`${linkedData.mcUsername}\`). Người dùng này bây giờ có thể verify lại từ đầu nếu cần.`)
            .setColor(0xED4245)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
