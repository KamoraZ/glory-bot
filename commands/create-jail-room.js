const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const jailConfigPath = path.join(__dirname, '..', 'jailConfig.json');

function saveConfig(data) {
    fs.writeFileSync(jailConfigPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-jail-room')
        .setDescription('Tạo phòng Jail: Ẩn mọi kênh khác nhưng vẫn giữ quyền xem & chat trong phòng giam'),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) để sử dụng lệnh này!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;

            let jailRole = guild.roles.cache.find(r => r.name === 'Jailed');
            if (!jailRole) {
                jailRole = await guild.roles.create({
                    name: 'Jailed',
                    color: 0x2C2F33,
                    reason: 'Role dành cho thành viên bị nhốt tù',
                });
            }

            const jailCategory = await guild.channels.create({
                name: '🔒 JAIL ZONE',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: jailRole.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                    }
                ]
            });

            const jailChannel = await guild.channels.create({
                name: 'phong-biet-giam',
                type: ChannelType.GuildText,
                parent: jailCategory.id,
                topic: 'Phòng biệt giam dành cho các thành viên quậy phá.',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: jailRole.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                    }
                ]
            });

            // Khóa tất cả các kênh / category khác trên server không cho role Jailed nhìn thấy
            const channels = guild.channels.cache.values();
            for (const channel of channels) {
                if (channel.id !== jailChannel.id && channel.id !== jailCategory.id) {
                    try {
                        await channel.permissionOverwrites.edit(jailRole, {
                            ViewChannel: false,
                            SendMessages: false,
                        });
                    } catch (e) {}
                }
            }

            saveConfig({
                guildId: guild.id,
                jailRoleId: jailRole.id,
                jailChannelId: jailChannel.id
            });

            const embed = new EmbedBuilder()
                .setTitle('🔒 **THIẾT LẬP PHÒNG JAIL HOÀN TẤT**')
                .setDescription(`Đã thiết lập thành công!\nTù nhân mang role **@Jailed** sẽ **chỉ nhìn thấy và chat được ở kênh ${jailChannel}**, hoàn toàn bị ẩn khỏi tất cả các kênh khác trên server.`)
                .setColor(0xE74C3C);

            await jailChannel.send({ embeds: [embed] });
            await interaction.editReply({ content: `✅ Đã thiết lập phòng Jail thành công!` });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi thiết lập phòng Jail.' });
        }
    },
};
