const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();
const commandsArray = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commandsArray.push(command.data.toJSON());
    }
}

client.once('ready', async () => {
    console.log(`[🤖] Đã đăng nhập bot: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('[🧹] Đang xóa toàn bộ lệnh Global cũ...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });

        console.log('[🧹] Đang xóa toàn bộ lệnh tại các Guild (Server)...');
        for (const [guildId] of client.guilds.cache) {
            await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: [] });
            console.log(`  - Đã xóa lệnh guild cho server ID: ${guildId}`);
        }

        console.log('[⏳] Đang chờ 3 giây để Discord API đồng bộ...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('[🔄] Đang đăng ký lại toàn bộ Slash Commands (Global)...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsArray });

        console.log('[✨ THÀNH CÔNG] Đã reset và đăng ký sạch sẽ toàn bộ Slash Commands!');
        client.destroy();
        process.exit(0);
    } catch (error) {
        console.error('[❌ LỖI]', error);
        client.destroy();
        process.exit(1);
    }
});

if (!process.env.DISCORD_TOKEN) {
    console.error('[❌ LỖI] Thiếu DISCORD_TOKEN trong .env');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
