const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const customInvitesPath = path.join(__dirname, '..', 'customInvites.json');

function getCustomInvites() {
    try {
        if (fs.existsSync(customInvitesPath)) {
            return JSON.parse(fs.readFileSync(customInvitesPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveCustomInvites(data) {
    fs.writeFileSync(customInvitesPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite-link')
        .setDescription('Tạo link lời mời (Invite) cá nhân được hệ thống ghi nhận chính xác người mời'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.CreateInstantInvite)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Tạo Lời Mời để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const invite = await interaction.channel.createInvite({
                maxAge: 0, // Không hết hạn
                maxUses: 0, // Không giới hạn
                unique: true,
                reason: `Được tạo bởi ${interaction.user.tag} (${interaction.user.id})`
            });

            // Lưu mapping invite code với user tạo ra nó để giải quyết triệt để lỗi Discord API nhận inviter là bot
            const customInvites = getCustomInvites();
            customInvites[invite.code] = {
                userId: interaction.user.id,
                tag: interaction.user.tag,
                guildId: interaction.guild.id,
                createdAt: new Date().toISOString()
            };
            saveCustomInvites(customInvites);

            // Cập nhật cache invite ngay lập tức
            if (interaction.client.invites) {
                const freshInvites = await interaction.guild.invites.fetch().catch(() => null);
                if (freshInvites) {
                    interaction.client.invites.set(interaction.guild.id, freshInvites);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🔗 **TẠO LINK MỜI CÁ NHÂN THÀNH CÔNG**')
                .setDescription(`Đã tạo link mời cá nhân của bạn tại kênh ${interaction.channel}:\n\`https://discord.gg/${invite.code}\`\n\n📌 *Hệ thống đã ghi nhận bạn là chủ nhân của link này. Khi có thành viên gia nhập, bạn sẽ được tính điểm invite chính xác 100%!*`)
                .setColor(0x2ECC71)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Lỗi khi tạo invite link:', error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo link lời mời.' });
        }
    },
};
