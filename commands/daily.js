const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const economyPath = path.join(__dirname, '..', 'economy.json');

function getEconomy() {
    try {
        if (fs.existsSync(economyPath)) {
            return JSON.parse(fs.readFileSync(economyPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveEconomy(data) {
    fs.writeFileSync(economyPath, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim free daily GloryCoin reward (once every 24 hours)'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = getEconomy();

        if (!eco[userId] || !eco[userId].acceptedTerms) {
            const tosEmbed = new EmbedBuilder()
                .setTitle('📜 GAMBLING TERMS OF SERVICE (GLORYCOIN)')
                .setDescription('You must agree to the terms of service before using the gambling system!\n\n👇 *Click the button below to accept the terms and claim **1,000 GloryCoin** to start!*')
                .setColor(0xFEE75C);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_gambling_tos')
                    .setLabel('✅ Agree & Claim 1,000 GloryCoin')
                    .setStyle(ButtonStyle.Success)
            );
            return interaction.reply({ embeds: [tosEmbed], components: [row], ephemeral: true });
        }

        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000; // 24 hours
        const lastDaily = eco[userId].lastDaily || 0;

        if (now - lastDaily < cooldown) {
            const nextTime = Math.floor((lastDaily + cooldown) / 1000);
            return interaction.reply({
                content: `⏳ You have already claimed your daily coins today! Try again <t:${nextTime}:R>.`,
                ephemeral: true
            });
        }

        const reward = Math.floor(Math.random() * 3000) + 2000; // 2000 - 5000 GloryCoin
        eco[userId].balance += reward;
        eco[userId].lastDaily = now;
        saveEconomy(eco);

        const embed = new EmbedBuilder()
            .setTitle('🎁 Daily Reward Claimed')
            .setDescription(`Congratulations **${interaction.user.username}**! You received **+${reward.toLocaleString()} GloryCoin**!`)
            .addFields({ name: '🪙 New Balance', value: `\`${eco[userId].balance.toLocaleString()} GloryCoin\``, inline: true })
            .setColor(0x57F287)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
