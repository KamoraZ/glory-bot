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
        .setName('pay')
        .setDescription('Transfer GloryCoin from your wallet to another user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user you want to send GloryCoin to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of GloryCoin to transfer')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        const senderId = interaction.user.id;
        const eco = getEconomy();

        if (!eco[senderId] || !eco[senderId].acceptedTerms) {
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

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (target.id === senderId) {
            return interaction.reply({
                content: '❌ You cannot transfer GloryCoin to yourself!',
                ephemeral: true
            });
        }

        if (target.bot) {
            return interaction.reply({
                content: '❌ You cannot transfer GloryCoin to a bot!',
                ephemeral: true
            });
        }

        if (eco[senderId].balance < amount) {
            return interaction.reply({
                content: `❌ You do not have enough GloryCoin! Your balance is **${eco[senderId].balance.toLocaleString()} GloryCoin**.`,
                ephemeral: true
            });
        }

        if (!eco[target.id]) {
            eco[target.id] = { balance: 0, lastDaily: 0, acceptedTerms: false };
        }

        eco[senderId].balance -= amount;
        eco[target.id].balance += amount;
        saveEconomy(eco);

        const embed = new EmbedBuilder()
            .setTitle('💸 GloryCoin Transfer Successful')
            .setDescription(`Successfully transferred **${amount.toLocaleString()} GloryCoin** to **${target.username}**!`)
            .addFields(
                { name: '👤 Recipient', value: `${target}`, inline: true },
                { name: '💰 Your New Balance', value: `\`${eco[senderId].balance.toLocaleString()} GloryCoin\``, inline: true }
            )
            .setColor(0x57F287)
            .setTimestamp()
            .setFooter({ text: 'GloryCoin P2P Transfer System' });

        await interaction.reply({ embeds: [embed] });
    },
};
