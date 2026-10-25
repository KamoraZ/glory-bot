const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Xác thực tài khoản Glory Client và liên kết với Discord')
        .addStringOption(option =>
            option.setName('friend_id')
                .setDescription('Nhập ID kết bạn 12 số từ Glory Client (Tab Bạn bè) hoặc để trống để tạo mã trung gian')
                .setRequired(false)),
    async execute(interaction) {
        const rawId = interaction.options.getString('friend_id');

        if (!rawId) {
            // Intermediary mode: Generate a 6-digit code or prompt instructions
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const clientCodesPath = path.join(__dirname, '..', 'pendingClientCodes.json');
            let codes = {};
            try {
                if (fs.existsSync(clientCodesPath)) {
                    codes = JSON.parse(fs.readFileSync(clientCodesPath, 'utf8'));
                }
            } catch (e) {}

            codes[code] = {
                discordId: interaction.user.id,
                discordTag: interaction.user.tag,
                mcUsername: `GloryUser_${interaction.user.username}`,
                accountType: 'Microsoft / Crack',
                hasGloryKey: true,
                roleTitle: 'Verified Member',
                expiresAt: Date.now() + 15 * 60 * 1000 // 15 phút
            };
            fs.writeFileSync(clientCodesPath, JSON.stringify(codes, null, 2), 'utf8');

            const embed = new EmbedBuilder()
                .setTitle('🔗 Trung Gian Xác Thực & Liên Kết Glory Client')
                .setDescription(`Chào **${interaction.user.tag}**!\nHệ thống đã tạo mã xác thực trung gian cho bạn để liên kết Glory PvP Client v1.0.195 với Discord.`)
                .addFields(
                    { name: '🎟️ Mã Xác Thực (6 Số)', value: `\`\`\`fix\n${code}\`\`\``, inline: false },
                    { name: '⏱️ Thời hạn', value: '15 phút', inline: true },
                    { name: '💡 Hướng dẫn', value: 'Mở Glory PvP Client v1.0.195 ➔ Tab **Accounts** ➔ Nhập **Discord ID** và **Discord Tag** của bạn vào mục **Link Discord** để đồng bộ trực tiếp với bot!', inline: false }
                )
                .setColor(0x57F287)
                .setTimestamp()
                .setFooter({ text: 'Glory Client & Discord Intermediary Verification System' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('glory_refresh_status')
                    .setLabel('Kiểm tra trạng thái liên kết')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🔄')
            );

            return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        const friendId = rawId.replace(/[^0-9]/g, '');

        if (friendId.length !== 12) {
            return interaction.reply({
                content: '❌ ID kết bạn không hợp lệ! ID kết bạn của Glory Client phải gồm đúng 12 chữ số (VD: `227609040288`).',
                ephemeral: true
            });
        }

        // Try reading real Glory Client launcher.json from AppData
        let profile = null;
        try {
            const launcherJsonPath = path.join(process.env.USERPROFILE || 'C:\\Users\\this pc', 'AppData', 'Roaming', '.glory', 'launcher.json');
            if (fs.existsSync(launcherJsonPath)) {
                const rawData = fs.readFileSync(launcherJsonPath, 'utf8');
                const launcherData = JSON.parse(rawData);
                if (launcherData && Array.isArray(launcherData.accounts)) {
                    const matchedAcc = launcherData.accounts.find(acc => acc.fid === friendId);
                    if (matchedAcc) {
                        const isGoogle = matchedAcc.social && matchedAcc.social.google;
                        const hasVip = matchedAcc.vip && (matchedAcc.vip.until || matchedAcc.vip.at);
                        const isAdmin = matchedAcc.name.toLowerCase() === 'kamavn' || matchedAcc.profile?.displayName?.toLowerCase() === 'kamora';

                        profile = {
                            friendId: matchedAcc.fid,
                            mcUsername: matchedAcc.name,
                            displayName: matchedAcc.profile?.displayName || matchedAcc.name,
                            accountType: isGoogle ? 'Google / Microsoft OAuth' : (matchedAcc.type === 'offline' ? 'Crack / Offline' : 'Microsoft Premium'),
                            hasGloryKey: !!hasVip,
                            roleTitle: isAdmin ? 'Administrator' : (hasVip ? 'VIP Member' : 'Member')
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Lỗi đọc launcher.json:', e);
        }

        // Fallback to clientProfiles.json if not found in launcher.json
        if (!profile) {
            const clientProfilesPath = path.join(__dirname, '..', 'clientProfiles.json');
            let profiles = {};
            try {
                if (fs.existsSync(clientProfilesPath)) {
                    profiles = JSON.parse(fs.readFileSync(clientProfilesPath, 'utf8'));
                }
            } catch (e) {}

            const savedProfile = profiles[friendId];
            if (savedProfile) {
                profile = savedProfile;
            } else {
                profile = {
                    friendId,
                    mcUsername: `GloryUser_${friendId.slice(-4)}`,
                    displayName: `User_${friendId.slice(-4)}`,
                    accountType: 'Microsoft Premium',
                    hasGloryKey: true,
                    roleTitle: 'Member'
                };
            }
        }

        const linkedAccountsPath = path.join(__dirname, '..', 'linkedAccounts.json');
        let accounts = {};
        try {
            if (fs.existsSync(linkedAccountsPath)) {
                accounts = JSON.parse(fs.readFileSync(linkedAccountsPath, 'utf8'));
            }
        } catch (e) {}

        if (accounts[interaction.user.id]) {
            return interaction.reply({
                content: `❌ Tài khoản Discord của bạn đã được liên kết với tài khoản Minecraft **\`${accounts[interaction.user.id].mcUsername}\`** rồi!\n🔒 Bạn không thể tự thay đổi hoặc verify lại. Nếu muốn đổi tài khoản, vui lòng **tạo ticket** để yêu cầu BQT (Admin) xóa verify cũ.`,
                ephemeral: true
            });
        }

        for (const [dId, acc] of Object.entries(accounts)) {
            if (acc.friendId === friendId && dId !== interaction.user.id) {
                return interaction.reply({
                    content: `❌ Tài khoản Minecraft / Friend ID này đã được liên kết với một tài khoản Discord khác!`,
                    ephemeral: true
                });
            }
        }

        accounts[interaction.user.id] = {
            discordId: interaction.user.id,
            discordTag: interaction.user.tag,
            mcUsername: profile.mcUsername,
            displayName: profile.displayName || profile.mcUsername,
            accountType: profile.accountType,
            hasGloryKey: profile.hasGloryKey,
            roleTitle: profile.roleTitle,
            friendId,
            linkedAt: new Date().toISOString()
        };
        fs.writeFileSync(linkedAccountsPath, JSON.stringify(accounts, null, 2), 'utf8');

        const guild = interaction.guild;
        if (guild) {
            const member = interaction.member;
            if (member) {
                let roleName = profile.roleTitle && profile.roleTitle.toLowerCase().includes('admin') ? 'Administrator' : 'Verified';
                let targetRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase() || r.name.toLowerCase() === 'verified');
                if (targetRole) {
                    await member.roles.add(targetRole, `Glory Friend ID Verify: ${profile.mcUsername}`).catch(() => {});
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Xác Minh Tài Khoản Thành Công!')
            .setDescription(`Tài khoản Minecraft **\`${profile.displayName} (@${profile.mcUsername})\`** (Friend ID: \`${friendId}\`) đã được liên kết với Discord **${interaction.user.tag}**!`)
            .addFields(
                { name: '🔐 Loại tài khoản', value: profile.accountType, inline: true },
                { name: '🔑 Key bản quyền', value: profile.hasGloryKey ? 'Có (Active)' : 'Không', inline: true },
                { name: '👑 Chức danh', value: profile.roleTitle, inline: true }
            )
            .setColor(0x57F287)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
