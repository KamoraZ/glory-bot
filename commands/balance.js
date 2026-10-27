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
        .setName('balance')
        .setDescription('Check your or another user\'s GloryCoin balance')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user to check (leave blank to check yourself)')
                .setRequired(false)),
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

        const target = interaction.options.getUser('user') || interaction.user;
        if (!eco[target.id]) {
            eco[target.id] = { balance: 0, lastDaily: 0, acceptedTerms: false };
            saveEconomy(eco);
        }

        const userEco = eco[target.id];

        const embed = new EmbedBuilder()
            .setTitle(`💰 GloryCoin Wallet • ${target.username}`)
            .setThumbnail(target.displayAvatarURL())
            .setColor(0xF1C40F)
            .addFields(
                { name: '🪙 Current Balance', value: `\`${userEco.balance.toLocaleString()} GloryCoin\``, inline: true },
                { name: '🎁 Daily Status', value: userEco.lastDaily && Date.now() - userEco.lastDaily < 86400000 ? `<t:${Math.floor((userEco.lastDaily + 86400000) / 1000)}:R>` : '✨ **Ready to claim!** (Use `/daily`)', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'GloryCoin Gambling System • Type /daily for free daily coins' });

        await interaction.reply({ embeds: [embed] });
    },
};
