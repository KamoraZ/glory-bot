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
        .setName('terms')
        .setDescription('View gambling terms of service and claim 1,000 GloryCoin starter bonus'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = getEconomy();

        if (!eco[userId]) {
            eco[userId] = { balance: 0, lastDaily: 0, acceptedTerms: false };
            saveEconomy(eco);
        }

        if (eco[userId].acceptedTerms) {
            return interaction.reply({
                content: `✅ You have already agreed to the gambling terms! Current balance: **${eco[userId].balance.toLocaleString()} GloryCoin**.`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📜 GAMBLING TERMS OF SERVICE & RULES (GLORYCOIN)')
            .setDescription('Welcome to the GloryClient Entertainment & Gambling System!\n\n**Before participating, please review and agree to the rules below:**\n• No exploiting bugs, cheats, or third-party tools to manipulate balances.\n• `GloryCoin` is used exclusively for entertainment within this server and has no real-world cash value.\n• All game results (`/coinflip`, `/roll`, etc.) are 100% fair and random.\n\n👇 *Click the button below to accept the terms and instantly receive **1,000 GloryCoin** to start!*')
            .setColor(0xFEE75C)
            .setTimestamp()
            .setFooter({ text: 'GloryCoin Gambling System • Terms of Service' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_gambling_tos')
                    .setLabel('✅ Agree & Claim 1,000 GloryCoin')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
