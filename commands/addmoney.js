const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
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
        .setName('addmoney')
        .setDescription('[Admin] Add GloryCoin to a user wallet')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Target user to receive coins')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of GloryCoin to add')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: '❌ You need **Administrator** permissions to use this command!',
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        const eco = getEconomy();
        if (!eco[target.id]) {
            eco[target.id] = { balance: 1000, lastDaily: 0, acceptedTerms: true };
        }

        eco[target.id].balance += amount;
        saveEconomy(eco);

        const embed = new EmbedBuilder()
            .setTitle('💵 Admin Added GloryCoin')
            .setDescription(`Successfully added **+${amount.toLocaleString()} GloryCoin** to **${target.username}**!`)
            .addFields(
                { name: '👤 Target User', value: `${target}`, inline: true },
                { name: '🪙 New Balance', value: `\`${eco[target.id].balance.toLocaleString()} GloryCoin\``, inline: true }
            )
            .setColor(0x57F287)
            .setTimestamp()
            .setFooter({ text: 'GloryCoin Admin System' });

        await interaction.reply({ embeds: [embed] });
    },
};
