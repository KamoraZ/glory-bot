const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Tạo một sự kiện Giveaway (Phát quà)')
        .addStringOption(option =>
            option.setName('phan_thuong')
                .setDescription('Phần thưởng giveaway')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('thoi_gian_phut')
                .setDescription('Thời gian giveaway (tính bằng phút)')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) && 
            !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên (Administrator) hoặc Quản lý Server để sử dụng lệnh này!', ephemeral: true });
        }

        const prize = interaction.options.getString('phan_thuong');
        const durationMinutes = interaction.options.getInteger('thoi_gian_phut');

        await interaction.reply({ content: '🎉 Đã tạo giveaway thành công!', ephemeral: true });

        const endTime = Date.now() + durationMinutes * 60 * 1000;
        const entrants = new Set();

        function getGiveawayEmbed(participantCount) {
            return new EmbedBuilder()
                .setTitle('🎉 **GIVEAWAY - PHÁT QUÀ** 🎉')
                .setDescription(`Phần thưởng: **${prize}**\nSố người tham gia: **${participantCount}**\nThời gian kết thúc: <t:${Math.floor(endTime / 1000)}:R>\n\nNhấn nút **🎉 Tham gia** bên dưới để dự thi!`)
                .setColor(0xF1C40F)
                .setTimestamp(endTime);
        }

        const button = new ButtonBuilder()
            .setCustomId('join_giveaway')
            .setLabel('🎉 Tham gia')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(button);

        const giveawayMessage = await interaction.channel.send({ embeds: [getGiveawayEmbed(0)], components: [row] });

        const collector = giveawayMessage.createMessageComponentCollector({ time: durationMinutes * 60 * 1000 });

        collector.on('collect', async i => {
            if (i.customId === 'join_giveaway') {
                if (entrants.has(i.user.id)) {
                    await i.reply({ content: '⚠️ Bạn đã tham gia giveaway này rồi!', ephemeral: true });
                } else {
                    entrants.add(i.user.id);
                    await i.reply({ content: `✅ Bạn đã tham gia thành công! Tổng số người tham gia: ${entrants.size}`, ephemeral: true });
                    await giveawayMessage.edit({ embeds: [getGiveawayEmbed(entrants.size)] }).catch(() => {});
                }
            }
        });

        collector.on('end', async () => {
            const entrantsArray = Array.from(entrants);
            let winnerText = 'Không có ai tham gia.';

            if (entrantsArray.length > 0) {
                const winnerId = entrantsArray[Math.floor(Math.random() * entrantsArray.length)];
                winnerText = `🏆 Chúc mừng <@${winnerId}> đã trúng giải **${prize}**! (${entrantsArray.length} người tham gia)`;
            }

            const endedEmbed = new EmbedBuilder()
                .setTitle('🎉 **GIVEAWAY ĐÃ KẾT THÚC** 🎉')
                .setDescription(`Phần thưởng: **${prize}**\nTổng số người tham gia: **${entrantsArray.length}**\n\n${winnerText}`)
                .setColor(0x95A5A6);

            const disabledButton = new ButtonBuilder()
                .setCustomId('join_giveaway')
                .setLabel('🎉 Đã kết thúc')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

            await giveawayMessage.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => {});
            await interaction.channel.send({ content: winnerText }).catch(() => {});
        });
    },
};
