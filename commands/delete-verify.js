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
        const renderApiUrl = process.env.RENDER_API_URL || process.env.FRIEND_RENDER_URL || 'https://glory-bot-gxg5.onrender.com';

        await interaction.deferReply({ ephemeral: true });

        let deleted = false;
        let linkedData = null;

        // Try Render API first
        try {
            const response = await fetch(`${renderApiUrl}/api/delete-verify/${targetUser.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminDiscordId: interaction.user.id })
            });
            if (response.ok) {
                const result = await response.json();
                linkedData = { mcUsername: result.mcUsername };
                deleted = true;
            }
        } catch (e) {
            console.warn('Render API delete-verify failed, falling back to local storage:', e.message);
        }

        // Fallback to local linkedAccounts.json if API failed
        if (!deleted) {
            const linkedAccountsPath = path.join(__dirname, '..', 'linkedAccounts.json');
            try {
                if (fs.existsSync(linkedAccountsPath)) {
                    let accounts = JSON.parse(fs.readFileSync(linkedAccountsPath, 'utf8'));
                    if (accounts[targetUser.id]) {
                        linkedData = accounts[targetUser.id];
                        delete accounts[targetUser.id];
                        fs.writeFileSync(linkedAccountsPath, JSON.stringify(accounts, null, 2), 'utf8');
                        deleted = true;
                    }
                }
            } catch (e) {}
        }

        if (!deleted || !linkedData) {
            return interaction.editReply({
                content: `❌ Thành viên ${targetUser} chưa liên kết tài khoản Minecraft nào trên hệ thống!`
            });
        }

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
            .setDescription(`Đã xóa thành công liên kết Minecraft của **${targetUser.tag}** (Tài khoản cũ: \`${linkedData.mcUsername || 'N/A'}\`). Người dùng này bây giờ có thể verify lại từ đầu nếu cần.`)
            .setColor(0xED4245)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
