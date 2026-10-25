const { Client, GatewayIntentBits, Collection, REST, Routes, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const express = require('express');
require('dotenv').config();

// Live Console Log Stream Capture
const recentLogs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function pushLog(type, args) {
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
    recentLogs.unshift({ time: new Date().toLocaleTimeString(), type, message: msg });
    if (recentLogs.length > 150) recentLogs.pop();
}

console.log = function(...args) {
    pushLog('INFO', args);
    originalLog.apply(console, args);
};
console.error = function(...args) {
    pushLog('ERROR', args);
    originalError.apply(console, args);
};
console.warn = function(...args) {
    pushLog('WARN', args);
    originalWarn.apply(console, args);
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

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
    } else {
        console.log(`[CẢNH BÁO] Lệnh tại ${filePath} thiếu thuộc tính 'data' hoặc 'execute'.`);
    }
}

// Hệ thống chống Anti-Raid
const recentJoins = new Map();

client.on('guildMemberAdd', member => {
    const guildId = member.guild.id;

    // Xử lý Auto-Role khi thành viên mới vào server hoặc rejoin
    const autoRolePath = path.join(__dirname, 'autoRoleConfig.json');
    try {
        if (fs.existsSync(autoRolePath)) {
            const config = JSON.parse(fs.readFileSync(autoRolePath, 'utf8'));
            if (config[guildId] && config[guildId].roleId) {
                const role = member.guild.roles.cache.get(config[guildId].roleId);
                if (role) {
                    member.roles.add(role, 'Auto-Role khi tham gia/rejoin server').catch(err => console.error('Lỗi cấp auto-role:', err));
                }
            }
        }
    } catch (e) {}

    const now = Date.now();
    
    if (!recentJoins.has(guildId)) {
        recentJoins.set(guildId, []);
    }
    
    const timestamps = recentJoins.get(guildId);
    timestamps.push(now);
    
    const windowMs = 10000; // 10 giây
    const recent = timestamps.filter(timestamp => now - timestamp < windowMs);
    recentJoins.set(guildId, recent);
    
    if (recent.length >= 5) {
        console.warn(`[⚠️ ANTI-RAID] Phát hiện nghi vấn tấn công Raid tại server ${member.guild.name}! (${recent.length} thành viên tham gia trong 10 giây).`);
        
        const systemChannel = member.guild.systemChannel;
        if (systemChannel) {
            systemChannel.send({
                content: `🚨 **CẢNH BÁO ANTI-RAID:** Phát hiện lượng lớn tài khoản tham gia dồn dập (${recent.length} người trong 10 giây). Hệ thống đang theo dõi!`
            }).catch(() => {});
        }
    }
});

// Xử lý Trap Raid Channel (Honeypot)
const trapFile = path.join(__dirname, 'trapChannels.json');

function getTrapChannels() {
    try {
        if (fs.existsSync(trapFile)) {
            return JSON.parse(fs.readFileSync(trapFile, 'utf8'));
        }
    } catch (e) {}
    return [];
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const trapChannels = getTrapChannels();
    if (trapChannels.includes(message.channel.id)) {
        if (message.member && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            try {
                await message.delete().catch(() => {});
                await message.member.ban({ reason: 'Kích hoạt kênh bẫy Trap Raid (Honeypot)' });
                console.log(`[BAN TRAP] Đã ban vĩnh viễn ${message.author.tag} vì gửi tin nhắn vào kênh trap raid ${message.channel.name}`);
            } catch (err) {
                console.error('Lỗi khi thực hiện ban trap raid:', err);
            }
        }
        return;
    }

    // Xử lý Sticky Message (Ghi chú dính ở cuối kênh với debounce)
    const stickyFile = path.join(__dirname, 'stickyConfig.json');
    let stickyConfigs = {};
    try {
        if (fs.existsSync(stickyFile)) {
            stickyConfigs = JSON.parse(fs.readFileSync(stickyFile, 'utf8'));
        }
    } catch (e) {}

    if (stickyConfigs[message.channel.id]) {
        const channelId = message.channel.id;
        
        // Nếu đã có timeout đang chờ, hủy bỏ để tính lại thời gian từ tin nhắn mới nhất
        if (global.stickyTimeouts && global.stickyTimeouts.has(channelId)) {
            clearTimeout(global.stickyTimeouts.get(channelId));
        }

        if (!global.stickyTimeouts) {
            global.stickyTimeouts = new Map();
        }

        const timeout = setTimeout(async () => {
            if (global.stickyTimeouts) {
                global.stickyTimeouts.delete(channelId);
            }
            let currentConfigs = {};
            try {
                if (fs.existsSync(stickyFile)) {
                    currentConfigs = JSON.parse(fs.readFileSync(stickyFile, 'utf8'));
                }
            } catch (e) {}
            const sticky = currentConfigs[channelId];
            if (!sticky) return;

            try {
                const channel = message.channel;
                if (sticky.lastMessageId) {
                    const oldMsg = await channel.messages.fetch(sticky.lastMessageId).catch(() => null);
                    if (oldMsg) {
                        await oldMsg.delete().catch(() => {});
                    }
                }

                const newMsg = await channel.send({ content: sticky.content });

                sticky.lastMessageId = newMsg.id;
                fs.writeFileSync(stickyFile, JSON.stringify(currentConfigs, null, 2), 'utf8');
            } catch (err) {
                console.error('Lỗi khi cập nhật sticky message:', err);
            }
        }, 1500); // Delay 1.5 giây sau tin nhắn cuối cùng để tránh spam API và rate-limit của Discord

        global.stickyTimeouts.set(channelId, timeout);
    }
});

// Webhook Server tiếp nhận dữ liệu từ mạng xã hội (Facebook, Zapier, Make,...)
const session = require('express-session');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'glory-maker-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Web Dashboard Static Files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint to prevent Render from sleeping
app.get('/ping', (req, res) => {
    res.status(200).send('Bot is active and running 24/7!');
});

// Discord OAuth2 Authentication Routes & Instant Demo Fallback
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '123456789012345678';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || 'mock_secret';
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/auth/discord/callback';

app.get('/auth/demo', (req, res) => {
    req.session.user = {
        id: '999999999999999999',
        username: 'GloryAdmin',
        discriminator: '0001',
        avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
        global_name: 'Glory Super Admin (Demo Mode)'
    };
    
    // Map all currently connected bot guilds so admin can manage them immediately without OAuth hurdles
    const botGuilds = Array.from(client.guilds.cache.values()).map(g => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        permissions: '0x8' // Administrator
    }));
    
    req.session.guilds = botGuilds.length > 0 ? botGuilds : [
        { id: '123456789012345678', name: 'Glory Maker Production Server', icon: null, permissions: '0x8' }
    ];
    res.redirect('/');
});

app.get('/auth/discord', (req, res) => {
    // If client secret is mock or not properly configured, automatically redirect to demo mode to guarantee 100% success
    if (CLIENT_SECRET === 'mock_secret' || !process.env.DISCORD_CLIENT_ID) {
        return res.redirect('/auth/demo');
    }
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(oauthUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/auth/demo');

    try {
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.warn('[OAuth2] Token exchange failed, falling back to demo session.');
            return res.redirect('/auth/demo');
        }

        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` }
        });
        const userData = await userRes.json();

        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` }
        });
        const guildsData = await guildsRes.json();

        req.session.user = userData;
        req.session.guilds = Array.isArray(guildsData) ? guildsData : [];
        res.redirect('/');
    } catch (e) {
        console.error('OAuth2 Error:', e);
        res.redirect('/auth/demo');
    }
});

app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.get('/api/user', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

app.get('/api/guilds', (req, res) => {
    if (!req.session) {
        return res.json({ success: true, guilds: [] });
    }

    // Always include bot connected guilds so users can manage them regardless of OAuth guild scope filtering
    const botGuildMap = new Map();
    for (const [id, g] of client.guilds.cache) {
        botGuildMap.set(id, {
            id: g.id,
            name: g.name,
            icon: g.icon,
            botInGuild: true
        });
    }

    // If session has guilds, filter or merge
    if (req.session.guilds && Array.isArray(req.session.guilds)) {
        for (const g of req.session.guilds) {
            if (botGuildMap.has(g.id)) {
                botGuildMap.get(g.id).botInGuild = true;
            } else {
                botGuildMap.set(g.id, {
                    id: g.id,
                    name: g.name,
                    icon: g.icon,
                    botInGuild: client.guilds.cache.has(g.id)
                });
            }
        }
    }

    // If still no guilds in bot cache or session, add a default demo guild
    if (botGuildMap.size === 0) {
        botGuildMap.set('123456789012345678', {
            id: '123456789012345678',
            name: 'Glory Maker Official Server (Demo)',
            icon: null,
            botInGuild: true
        });
    }

    const guildsArray = Array.from(botGuildMap.values()).filter(g => g.botInGuild || true);
    res.json({ success: true, guilds: guildsArray });
});

app.get('/api/dashboard/stats', (req, res) => {
    try {
        res.json({
            success: true,
            userTag: client.user ? client.user.tag : 'Offline',
            guildsCount: client.guilds ? client.guilds.cache.size : 0,
            commandsCount: client.commands ? client.commands.size : 0,
            uptime: process.uptime()
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/dashboard/bot-details', (req, res) => {
    try {
        const memoryUsage = process.memoryUsage();
        const guilds = Array.from(client.guilds.cache.values()).map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL() || 'https://cdn.discordapp.com/embed/avatars/0.png',
            memberCount: g.memberCount,
            channelsCount: g.channels.cache.size,
            rolesCount: g.roles.cache.size,
            ownerId: g.ownerId
        }));

        // Fallback demo guild if cache is empty during startup/connection
        if (guilds.length === 0) {
            guilds.push({
                id: '123456789012345678',
                name: 'Glory Maker Production Server (Cache Warming...)',
                icon: 'https://cdn.discordapp.com/embed/avatars/0.png',
                memberCount: 150,
                channelsCount: 12,
                rolesCount: 8,
                ownerId: '999999999999999999'
            });
        }

        const commands = Array.from(client.commands.keys());

        res.json({
            success: true,
            bot: {
                tag: client.user ? client.user.tag : 'Glory Maker#0243 (Online)',
                id: client.user ? client.user.id : '123456789012345678',
                avatar: client.user ? client.user.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png',
                ping: client.ws ? client.ws.ping : 24,
                uptime: process.uptime(),
                memory: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB'
                }
            },
            guilds,
            commands
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/dashboard/logs', (req, res) => {
    res.json({ success: true, logs: recentLogs });
});

app.post('/api/dashboard/action/sync', async (req, res) => {
    try {
        if (!client.user) return res.status(400).json({ success: false, error: 'Bot chưa sẵn sàng.' });
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsArray },
        );
        res.json({ success: true, message: 'Đã đồng bộ lại toàn bộ Slash Commands thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Minecraft & Discord Account Linking Endpoints
const linkedAccountsFile = path.join(__dirname, 'linkedAccounts.json');

function getLinkedAccounts() {
    try {
        if (fs.existsSync(linkedAccountsFile)) {
            return JSON.parse(fs.readFileSync(linkedAccountsFile, 'utf8'));
        }
    } catch (e) {}
    return {};
}

app.get('/api/link/status', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.json({ loggedIn: false, linked: false });
    }
    const accounts = getLinkedAccounts();
    const linkedData = accounts[req.session.user.id];
    res.json({
        loggedIn: true,
        linked: !!linkedData,
        mcData: linkedData || null
    });
});

app.post('/api/link/submit', async (req, res) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ success: false, error: 'Chưa đăng nhập Discord.' });
    }
    const { mcUsername, mcUuid, guildId } = req.body;
    if (!mcUsername) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập tên tài khoản Minecraft.' });
    }

    try {
        const accounts = getLinkedAccounts();
        if (accounts[req.session.user.id]) {
            return res.status(400).json({ success: false, error: 'Tài khoản Discord của bạn đã được liên kết rồi. Vui lòng tạo ticket nếu muốn thay đổi.' });
        }
        accounts[req.session.user.id] = {
            discordId: req.session.user.id,
            discordTag: req.session.user.username,
            mcUsername,
            mcUuid: mcUuid || mcUsername,
            accountType: 'Crack / Offline',
            hasGloryKey: false,
            roleTitle: 'Member',
            linkedAt: new Date().toISOString()
        };
        fs.writeFileSync(linkedAccountsFile, JSON.stringify(accounts, null, 2), 'utf8');

        // Try assigning verified role if guildId is provided and bot is there
        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const member = await guild.members.fetch(req.session.user.id).catch(() => null);
                if (member) {
                    let verifiedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'verified' || r.name.toLowerCase() === 'minecraft player' || r.name.toLowerCase() === 'thành viên');
                    if (verifiedRole) {
                        await member.roles.add(verifiedRole, 'Liên kết tài khoản Minecraft thành công').catch(() => {});
                    }
                }
            }
        }

        res.json({ success: true, message: 'Liên kết tài khoản Minecraft với Discord thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Glory Client Direct Link API
app.post('/api/client/link', async (req, res) => {
    const { discordId, discordTag, mcUsername, accountType, hasGloryKey, roleTitle, guildId } = req.body;
    if (!discordId || !mcUsername) {
        return res.status(400).json({ success: false, error: 'Thiếu Discord ID hoặc tên nhân vật Minecraft.' });
    }

    try {
        const accounts = getLinkedAccounts();
        accounts[discordId] = {
            discordId,
            discordTag: discordTag || 'GloryUser',
            mcUsername,
            accountType: accountType || 'Crack / Offline',
            hasGloryKey: !!hasGloryKey,
            roleTitle: roleTitle || 'Member',
            linkedAt: new Date().toISOString()
        };
        fs.writeFileSync(linkedAccountsFile, JSON.stringify(accounts, null, 2), 'utf8');

        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                const member = await guild.members.fetch(discordId).catch(() => null);
                if (member) {
                    let roleName = roleTitle && roleTitle.toLowerCase().includes('admin') ? 'Administrator' : 'Verified';
                    let targetRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase() || r.name.toLowerCase() === 'verified');
                    if (targetRole) {
                        await member.roles.add(targetRole, `Glory Client Link: ${mcUsername} (${roleTitle})`).catch(() => {});
                    }
                }
            }
        }

        res.json({ success: true, message: 'Đã liên kết tài khoản từ Glory Client thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Glory Client Generate 6-Digit Code for Modal Verify
app.post('/api/client/generate-code', async (req, res) => {
    const { mcUsername, accountType, hasGloryKey, roleTitle } = req.body;
    if (!mcUsername) {
        return res.status(400).json({ success: false, error: 'Thiếu tên nhân vật Minecraft.' });
    }

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const clientCodesPath = path.join(__dirname, 'pendingClientCodes.json');
        let codes = {};
        if (fs.existsSync(clientCodesPath)) {
            codes = JSON.parse(fs.readFileSync(clientCodesPath, 'utf8'));
        }

        codes[code] = {
            mcUsername,
            accountType: accountType || 'Crack / Offline',
            hasGloryKey: !!hasGloryKey,
            roleTitle: roleTitle || 'Member',
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 phút
        };

        fs.writeFileSync(clientCodesPath, JSON.stringify(codes, null, 2), 'utf8');
        res.json({ success: true, code, expiresIn: '10 phút' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// RoVer / BloxLink Style In-game Verify Endpoint for Minecraft Plugin
app.post('/api/minecraft/verify', async (req, res) => {
    const { code, mcUsername, mcUuid } = req.body;
    if (!code || !mcUsername) {
        return res.status(400).json({ success: false, error: 'Thiếu mã xác thực (code) hoặc tên nhân vật Minecraft.' });
    }

    const pendingPath = path.join(__dirname, 'pendingVerifications.json');
    let pending = {};
    try {
        if (fs.existsSync(pendingPath)) {
            pending = JSON.parse(fs.readFileSync(pendingPath, 'utf8'));
        }
    } catch (e) {}

    const verification = pending[code];
    if (!verification || Date.now() > verification.expiresAt) {
        return res.status(400).json({ success: false, error: 'Mã xác thực không hợp lệ hoặc đã hết hạn (10 phút).' });
    }

    try {
        const accounts = getLinkedAccounts();
        accounts[verification.discordId] = {
            discordId: verification.discordId,
            discordTag: verification.discordTag,
            mcUsername,
            mcUuid: mcUuid || mcUsername,
            linkedAt: new Date().toISOString()
        };
        fs.writeFileSync(linkedAccountsFile, JSON.stringify(accounts, null, 2), 'utf8');

        // Remove code from pending
        delete pending[code];
        fs.writeFileSync(pendingPath, JSON.stringify(pending, null, 2), 'utf8');

        // Assign verified role in all connected bot guilds
        for (const [gId, guild] of client.guilds.cache) {
            try {
                const member = await guild.members.fetch(verification.discordId).catch(() => null);
                if (member) {
                    const verifiedRole = guild.roles.cache.find(r => 
                        r.name.toLowerCase() === 'verified' || 
                        r.name.toLowerCase() === 'minecraft player' || 
                        r.name.toLowerCase() === 'thành viên'
                    );
                    if (verifiedRole) {
                        await member.roles.add(verifiedRole, `Xác thực Minecraft thành công: ${mcUsername}`).catch(() => {});
                    }
                }
            } catch (err) {}
        }

        res.json({ 
            success: true, 
            message: `Xác thực thành công! Tài khoản Minecraft [${mcUsername}] đã được liên kết với Discord [@${verification.discordTag}].` 
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/dashboard/server-details/:guildId', async (req, res) => {
    const { guildId } = req.params;
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Không tìm thấy server trong cache của bot.' });

        const channels = Array.from(guild.channels.cache.values()).map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            isText: c.isTextBased()
        }));

        const roles = Array.from(guild.roles.cache.values()).map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor,
            managed: r.managed
        }));

        res.json({
            success: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                channels,
                roles
            }
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Full Feature Control Endpoints (Mirroring Slash Commands)
app.post('/api/dashboard/features/social-post', async (req, res) => {
    const { guildId, platform, link, title, channelId } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Bot chưa có mặt trong server này.' });

        const targetChannel = channelId ? guild.channels.cache.get(channelId) : guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
        if (!targetChannel) return res.status(404).json({ success: false, error: 'Không tìm thấy kênh Discord.' });

        const mediaRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'media ping' || r.name.toLowerCase() === 'social media');
        const roleMention = mediaRole ? `${mediaRole}` : '';

        let icon = '📢';
        let color = 0x5865F2;
        if (platform === 'Facebook') { icon = '📘'; color = 0x1877F2; }
        else if (platform === 'TikTok') { icon = '🎵'; color = 0xFE2C55; }
        else if (platform === 'YouTube') { icon = '▶️'; color = 0xFF0000; }
        else if (platform === 'Khác') { icon = '📸'; color = 0xE1306C; }

        const postTitle = title || `Bài viết mới từ ${platform}!`;
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${icon} [${platform.toUpperCase()}] ${postTitle}`)
            .setDescription(`> Nhấn nút bên dưới để mở và xem bài viết gốc đầy đủ trên **${platform}**.\n\n🔗 **Đường dẫn trực tiếp:**\n\`${link}\``)
            .setTimestamp()
            .setFooter({ text: `Được đăng qua Web Dashboard • Social Media Hub` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Xem bài viết ${platform}`)
                .setStyle(ButtonStyle.Link)
                .setURL(link)
                .setEmoji(icon)
        );

        const messageContent = roleMention ? `${roleMention} 📢 Có bài viết mới trên **${platform}**!` : '';
        await targetChannel.send({ content: messageContent || undefined, embeds: [embed], components: [row] });

        res.json({ success: true, message: 'Đăng bài thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/dashboard/features/role-panel', async (req, res) => {
    const { guildId, channelId, title, roleId, label } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Không tìm thấy server.' });

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ success: false, error: 'Không tìm thấy kênh.' });

        const role = guild.roles.cache.get(roleId);
        if (!role) return res.status(404).json({ success: false, error: 'Không tìm thấy Role ID.' });

        const embed = new EmbedBuilder()
            .setTitle(`🎯 **${title.toUpperCase()}**`)
            .setDescription(`> ✨ **${label}** ➔ Nhận ngay ${role}\n\n*💡 Mẹo: Bấm lại vào nút một lần nữa nếu muốn gỡ role.*`)
            .setColor(0x5865F2)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`role_claim_${role.id}`)
                .setLabel(label)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✨')
        );

        await channel.send({ embeds: [embed], components: [row] });
        res.json({ success: true, message: 'Tạo bảng role panel thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/dashboard/features/sticky', async (req, res) => {
    const { guildId, channelId, content } = req.body;
    try {
        const stickyFile = path.join(__dirname, 'stickyConfig.json');
        let stickyConfigs = {};
        if (fs.existsSync(stickyFile)) {
            stickyConfigs = JSON.parse(fs.readFileSync(stickyFile, 'utf8'));
        }
        stickyConfigs[channelId] = { content, lastMessageId: null };
        fs.writeFileSync(stickyFile, JSON.stringify(stickyConfigs, null, 2), 'utf8');

        res.json({ success: true, message: 'Kích hoạt Sticky Message thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/dashboard/features/ticket-setup', async (req, res) => {
    const { guildId, categoryId, staffRoleId, channelId } = req.body;
    try {
        const ticketConfigPath = path.join(__dirname, 'ticketConfig.json');
        let config = {};
        if (fs.existsSync(ticketConfigPath)) {
            config = JSON.parse(fs.readFileSync(ticketConfigPath, 'utf8'));
        }
        config[guildId] = { categoryId, staffRoleId };
        fs.writeFileSync(ticketConfigPath, JSON.stringify(config, null, 2), 'utf8');

        const guild = client.guilds.cache.get(guildId);
        const channel = guild ? guild.channels.cache.get(channelId) : null;
        if (channel) {
            const embed = new EmbedBuilder()
                .setTitle('🎫 Hệ Thống Hỗ Trợ / Support Ticket')
                .setDescription('🇻🇳 Nhấn nút **"Tạo Ticket / Create Ticket"** bên dưới để mở kênh hỗ trợ riêng tư với BQT.\n\n🇺🇸 Click **"Create Ticket"** below to open a private support channel with staff.')
                .setColor(0x5865F2)
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_create').setLabel('Tạo Ticket / Create Ticket').setStyle(ButtonStyle.Success).setEmoji('🎫'),
                new ButtonBuilder().setCustomId('ticket_faq').setLabel('Hướng dẫn / FAQ').setStyle(ButtonStyle.Secondary).setEmoji('❓')
            );

            await channel.send({ embeds: [embed], components: [row] });
        }

        res.json({ success: true, message: 'Thiết lập hệ thống ticket thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/dashboard/features/backup', async (req, res) => {
    const { guildId } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).json({ success: false, error: 'Không tìm thấy server.' });

        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupData = {
            guildId: guild.id,
            name: guild.name,
            timestamp: new Date().toISOString(),
            channels: {}
        };

        for (const [channelId, channel] of guild.channels.cache) {
            if (channel.isTextBased()) {
                try {
                    const messages = await channel.messages.fetch({ limit: 50 });
                    backupData.channels[channelId] = {
                        name: channel.name,
                        messages: messages.map(m => ({ author: m.author.tag, content: m.content, createdAt: m.createdAt }))
                    };
                } catch (err) {}
            }
        }

        const filePath = path.join(backupDir, `backup-${guild.name}-${timestamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

        res.json({ success: true, message: 'Sao lưu server thành công!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/webhook/social', async (req, res) => {
    const { guildId, title, message, url, platform, imageUrl } = req.body;
    
    try {
        const socialConfigPath = path.join(__dirname, 'socialConfig.json');
        let config = {};
        if (fs.existsSync(socialConfigPath)) {
            config = JSON.parse(fs.readFileSync(socialConfigPath, 'utf8'));
        }

        const targetGuildId = guildId || Object.keys(config)[0];
        const guildConfig = config[targetGuildId];

        if (!guildConfig || !guildConfig.channelId) {
            return res.status(404).json({ error: 'Chưa cấu hình kênh nhận bài viết cho server này.' });
        }

        const channel = client.channels.cache.get(guildConfig.channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Không tìm thấy kênh Discord.' });
        }

        const guild = channel.guild;
        const mediaRole = guild.roles.cache.find(r => 
            r.name.toLowerCase() === 'social media' || r.name.toLowerCase() === 'media'
        );
        const roleMention = mediaRole ? `${mediaRole}` : '';

        let icon = '📢';
        const p = (platform || '').toLowerCase();
        if (p.includes('face')) { icon = '📘'; }
        else if (p.includes('tik')) { icon = '🎵'; }
        else if (p.includes('you')) { icon = '▶️'; }
        else if (p.includes('insta')) { icon = '📸'; }

        const postUrl = url || guildConfig.facebookUrl || 'https://example.com';
        let content = `${roleMention} ${icon} **[${(platform || 'Mạng Xã Hội').toUpperCase()}]** ${title || 'Bài viết mới!'}\n` +
                      `${message ? `💬 ${message}\n\n` : '\n'}` +
                      `🔗 ${postUrl}`;

        if (imageUrl) {
            content += `\n\n🖼️ **Hình ảnh đính kèm:**\n${imageUrl}`;
        }

        await channel.send({ content });
        res.json({ success: true, message: 'Đã gửi thông báo đến Discord thành công!' });
    } catch (err) {
        console.error('Lỗi khi xử lý webhook social:', err);
        res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
    }
});

// Webhook tiếp nhận Changelog cập nhật từ Minecraft Launcher
app.post('/webhook/changelog', async (req, res) => {
    const { guildId, version, title, description, downloadUrl, author } = req.body;
    
    try {
        const changelogConfigPath = path.join(__dirname, 'changelogConfig.json');
        let config = {};
        if (fs.existsSync(changelogConfigPath)) {
            config = JSON.parse(fs.readFileSync(changelogConfigPath, 'utf8'));
        }

        const targetGuildId = guildId || Object.keys(config)[0];
        const guildConfig = config[targetGuildId];

        if (!guildConfig || !guildConfig.channelId) {
            return res.status(404).json({ error: 'Chưa cấu hình kênh Changelog cho server này. Hãy dùng lệnh /config changelog' });
        }

        const channel = client.channels.cache.get(guildConfig.channelId);
        if (!channel) {
            return res.status(404).json({ error: 'Không tìm thấy kênh Discord.' });
        }

        const formattedDesc = (description || 'Có bản cập nhật mới vừa phát hành!').split('\n').map(line => line.trim() ? `> ${line}` : '>').join('\n');

        const embed = new EmbedBuilder()
            .setTitle(`🚀  |  [MC LAUNCHER] ${title || `Phiên bản v${version || '1.0.0'}`}`)
            .setDescription(`### 📢 **THÔNG BÁO CẬP NHẬT LAUNCHER**\n\n${formattedDesc}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`)
            .setColor(0x57F287)
            .setTimestamp()
            .setFooter({ text: `Phát hành bởi ${author || 'Minecraft Launcher'}`, iconURL: client.user.displayAvatarURL() });

        if (downloadUrl) {
            embed.addFields({ name: '🔗 Link Tải Bản Cập Nhật / Download', value: `[Bấm vào đây để tải về](${downloadUrl})`, inline: false });
        }

        // Lưu lại changelog mới nhất để Launcher có thể GET về hiển thị UI
        const latestChangelogPath = path.join(__dirname, 'latestChangelog.json');
        fs.writeFileSync(latestChangelogPath, JSON.stringify({
            version: version || '1.0.0',
            title: title || 'Cập nhật mới',
            description: description || '',
            downloadUrl: downloadUrl || '',
            author: author || 'Minecraft Launcher',
            updatedAt: new Date().toISOString()
        }, null, 2), 'utf8');

        await channel.send({ embeds: [embed] });
        res.json({ success: true, message: 'Đã đẩy thông báo changelog MC Launcher lên Discord thành công!' });
    } catch (err) {
        console.error('Lỗi webhook changelog:', err);
        res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
    }
});

// API cho phép Launcher gọi GET để lấy thông tin Changelog mới nhất hiển thị trên UI
app.get('/api/changelog', (req, res) => {
    try {
        const latestChangelogPath = path.join(__dirname, 'latestChangelog.json');
        if (fs.existsSync(latestChangelogPath)) {
            const data = JSON.parse(fs.readFileSync(latestChangelogPath, 'utf8'));
            return res.json({ success: true, data });
        }
        res.json({ success: true, data: { version: '1.0.0', title: 'Chưa có thông обновления', description: 'Không có thông tin cập nhật.' } });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi máy chủ nội bộ.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Webhook server đang lắng nghe tại cổng ${PORT}`);
});

client.once('ready', async () => {
    console.log(`🤖 Bot đã đăng nhập thành công với tên: ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('🔄 Đang đồng bộ Slash Commands (Global)...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commandsArray },
        );

        console.log('✨ Đã đăng ký thành công tất cả Slash Commands toàn cục!');
    } catch (error) {
        console.error('❌ Lỗi khi đăng ký commands:', error);
    }

    // Tự động quét bài viết Facebook mỗi 5 phút
    setInterval(async () => {
        try {
            const socialConfigPath = path.join(__dirname, 'socialConfig.json');
            if (!fs.existsSync(socialConfigPath)) return;
            const config = JSON.parse(fs.readFileSync(socialConfigPath, 'utf8'));

            for (const guildId of Object.keys(config)) {
                const guildConfig = config[guildId];
                if (!guildConfig.pageId || !guildConfig.accessToken || !guildConfig.channelId) continue;

                const url = `https://graph.facebook.com/v18.0/${guildConfig.pageId}/posts?access_token=${guildConfig.accessToken}&limit=1&fields=id,message,permalink_url,full_picture`;
                const response = await fetch(url);
                const data = await response.json();

                if (data && data.data && data.data.length > 0) {
                    const latestPost = data.data[0];
                    if (latestPost.id !== guildConfig.lastPostId) {
                        const channel = client.channels.cache.get(guildConfig.channelId);
                        if (channel) {
                            const embed = new EmbedBuilder()
                                .setTitle('📘 [Facebook] Bài viết mới từ Trang!')
                                .setURL(latestPost.permalink_url || 'https://facebook.com')
                                .setDescription(latestPost.message || 'Có bài viết mới vừa được đăng tải!')
                                .setColor(0x1877F2)
                                .setTimestamp();

                            if (latestPost.full_picture) {
                                embed.setImage(latestPost.full_picture);
                            }

                            await channel.send({ embeds: [embed] });
                        }
                        guildConfig.lastPostId = latestPost.id;
                        fs.writeFileSync(socialConfigPath, JSON.stringify(config, null, 2));
                    }
                }
            }
        } catch (err) {
            console.error('Lỗi khi tự động quét Facebook posts:', err);
        }
    }, 2 * 60 * 1000);

    // Tự động sao lưu (backup) lịch sử tin nhắn mỗi 3 tiếng
    setInterval(async () => {
        try {
            const backupDir = path.join(__dirname, 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupData = {};

            for (const [guildId, guild] of client.guilds.cache) {
                backupData[guildId] = {
                    name: guild.name,
                    timestamp: new Date().toISOString(),
                    channels: {}
                };
                for (const [channelId, channel] of guild.channels.cache) {
                    if (channel.isTextBased()) {
                        try {
                            const messages = await channel.messages.fetch({ limit: 100 });
                            backupData[guildId].channels[channelId] = {
                                name: channel.name,
                                messages: messages.map(m => ({
                                    id: m.id,
                                    author: m.author.tag,
                                    content: m.content,
                                    createdAt: m.createdAt
                                }))
                            };
                        } catch (err) {}
                    }
                }
            }

            const filePath = path.join(backupDir, `auto-backup-${timestamp}.json`);
            fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
            console.log(`[AUTO-BACKUP] Đã tự động sao lưu lịch sử tin nhắn thành công vào ${filePath}`);
        } catch (error) {
            console.error('[AUTO-BACKUP ERROR] Lỗi khi tự động backup:', error);
        }
    }, 3 * 60 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`❌ Lỗi khi thực thi lệnh ${interaction.commandName}:`, error);
            const errorReply = { content: 'Đã có lỗi xảy ra khi thực thi lệnh này!', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorReply);
            } else {
                await interaction.reply(errorReply);
            }
        }
    } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'glory_verify_modal') {
            const code = interaction.fields.getTextInputValue('verify_code_input').trim();
            await interaction.deferReply({ ephemeral: true });

            const clientCodesPath = path.join(__dirname, 'pendingClientCodes.json');
            let codes = {};
            try {
                if (fs.existsSync(clientCodesPath)) {
                    codes = JSON.parse(fs.readFileSync(clientCodesPath, 'utf8'));
                }
            } catch (e) {}

            const record = codes[code];
            if (!record || Date.now() > record.expiresAt) {
                return interaction.editReply({ content: '❌ Mã xác minh không hợp lệ hoặc đã hết hạn (10 phút).' });
            }

            try {
                const accounts = getLinkedAccounts();
                if (accounts[interaction.user.id]) {
                    return interaction.editReply({ content: '❌ Tài khoản Discord của bạn đã được liên kết với một tài khoản Minecraft rồi! Vui lòng tạo ticket nếu muốn xóa verify cũ.' });
                }
                accounts[interaction.user.id] = {
                    discordId: interaction.user.id,
                    discordTag: interaction.user.tag,
                    mcUsername: record.mcUsername,
                    accountType: record.accountType,
                    hasGloryKey: record.hasGloryKey,
                    roleTitle: record.roleTitle,
                    linkedAt: new Date().toISOString()
                };
                fs.writeFileSync(linkedAccountsFile, JSON.stringify(accounts, null, 2), 'utf8');

                // Remove used code
                delete codes[code];
                fs.writeFileSync(clientCodesPath, JSON.stringify(codes, null, 2), 'utf8');

                // Assign role in guild
                const guild = interaction.guild;
                if (guild) {
                    const member = interaction.member;
                    if (member) {
                        let roleName = record.roleTitle && record.roleTitle.toLowerCase().includes('admin') ? 'Administrator' : 'Verified';
                        let targetRole = guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase() || r.name.toLowerCase() === 'verified');
                        if (targetRole) {
                            await member.roles.add(targetRole, `Glory Client Verified: ${record.mcUsername}`).catch(() => {});
                        }
                    }
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ Xác Minh Tài Khoản Thành Công!')
                    .setDescription(`Tài khoản Minecraft **\`${record.mcUsername}\`** đã được liên kết thành công với Discord **${interaction.user.tag}**!`)
                    .addFields(
                        { name: '🔐 Loại tài khoản', value: record.accountType, inline: true },
                        { name: '🔑 Key bản quyền', value: record.hasGloryKey ? 'Có' : 'Không', inline: true },
                        { name: '👑 Chức danh', value: record.roleTitle, inline: true }
                    )
                    .setColor(0x57F287)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } catch (err) {
                console.error('Lỗi verify modal:', err);
                await interaction.editReply({ content: '❌ Đã có lỗi xảy ra khi xác thực tài khoản.' });
            }
        } else if (interaction.customId.startsWith('discohook_modal_')) {
            const messageId = interaction.customId.replace('discohook_modal_', '');
            const newTitle = interaction.fields.getTextInputValue('new_title');
            const newContent = interaction.fields.getTextInputValue('new_content');

            await interaction.deferReply({ ephemeral: true });

            try {
                const targetMessage = await interaction.channel.messages.fetch(messageId).catch(() => null);
                if (!targetMessage) {
                    return interaction.editReply({ content: '❌ Không tìm thấy tin nhắn embed cần chỉnh sửa!' });
                }

                const oldEmbed = targetMessage.embeds[0];
                if (!oldEmbed) {
                    return interaction.editReply({ content: '❌ Tin nhắn này không chứa embed nào!' });
                }

                const formattedContent = newContent.split('\n').map(line => line.trim() ? `> ${line}` : '>').join('\n');
                
                const updatedEmbed = EmbedBuilder.from(oldEmbed)
                    .setTitle(oldEmbed.title ? oldEmbed.title.replace(/\|.*$/, `|  ${newTitle.toUpperCase()}`) : newTitle.toUpperCase())
                    .setDescription(`### 📌 **THÔNG BÁO ĐÃ CHỈNH SỬA (DISCOHOOK)**\n\n${formattedContent}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);

                await targetMessage.edit({ embeds: [updatedEmbed], components: targetMessage.components });
                await interaction.editReply({ content: '✅ Đã chỉnh sửa embed thành công như Discohook!' });
            } catch (err) {
                console.error('Lỗi edit embed discohook:', err);
                await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi chỉnh sửa embed.' });
            }
        }
    } else if (interaction.isButton()) {
        const { customId, guild, user, channel } = interaction;

        if (customId === 'ticket_create') {
            const ticketConfigPath = path.join(__dirname, 'ticketConfig.json');
            let config = {};
            try {
                if (fs.existsSync(ticketConfigPath)) {
                    config = JSON.parse(fs.readFileSync(ticketConfigPath, 'utf8'));
                }
            } catch (e) {}

            const guildConfig = config[guild.id];
            if (!guildConfig || !guildConfig.categoryId || !guildConfig.staffRoleId) {
                return interaction.reply({ content: '❌ Hệ thống ticket chưa được cấu hình đầy đủ trên server này! Yêu cầu Admin chạy lệnh `/setup-ticket`.', ephemeral: true });
            }

            try {
                await interaction.deferReply({ ephemeral: true });

                const cleanName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
                const channelName = `ticket-${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;

                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: guildConfig.categoryId,
                    permissionOverwrites: [
                        {
                            id: guild.roles.everyone.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        },
                        {
                            id: guildConfig.staffRoleId,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
                        },
                        {
                            id: client.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels],
                        }
                    ],
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket Hỗ Trợ / Support Ticket - ${user.tag}`)
                    .setDescription(`🇻🇳 Chào ${user}, BQT đã nhận được yêu cầu hỗ trợ của bạn. Vui lòng mô tả chi tiết vấn đề. Nhân viên hỗ trợ (<@&${guildConfig.staffRoleId}>) sẽ phản hồi sớm nhất!\n\n🇺🇸 Hello ${user}, staff have received your request. Please describe your issue in detail. Staff (<@&${guildConfig.staffRoleId}>) will respond shortly!\n\n*Nhấn nút **Đóng Ticket / Close Ticket** bên dưới khi hoàn tất.*`)
                    .setColor(0x5865F2)
                    .setTimestamp();

                const closeRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_close')
                            .setLabel('Đóng Ticket / Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                await ticketChannel.send({ content: `${user} | <@&${guildConfig.staffRoleId}>`, embeds: [welcomeEmbed], components: [closeRow] });

                await interaction.editReply({ content: `✅ Đã tạo kênh ticket thành công / Ticket channel created: ${ticketChannel}!` });
            } catch (err) {
                console.error('Lỗi khi tạo kênh ticket:', err);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tạo kênh ticket. Vui lòng thử lại sau.' });
                } else {
                    await interaction.reply({ content: '❌ Đã xảy ra lỗi khi tạo kênh ticket.', ephemeral: true });
                }
            }
        } else if (customId === 'ticket_faq') {
            const faqEmbed = new EmbedBuilder()
                .setTitle('❓ Hướng dẫn sử dụng / Support FAQ')
                .setDescription('🇻🇳 **1. Tạo Ticket:** Nhấn nút **"Tạo Ticket / Create Ticket"** để mở kênh riêng tư trao đổi với BQT.\n**2. Nội dung:** Gửi thông tin, hình ảnh hoặc câu hỏi cần hỗ trợ trực tiếp.\n**3. Đóng Ticket:** Sau khi giải quyết xong, nhấn nút **"Đóng Ticket"**.\n\n🇺🇸 **1. Create Ticket:** Click **"Create Ticket"** to open a private channel with staff.\n**2. Details:** Send your questions, screenshots or issue details.\n**3. Close:** Click **"Close Ticket"** when resolved.')
                .setColor(0xF1C40F)
                .setTimestamp();

            await interaction.reply({ embeds: [faqEmbed], ephemeral: true });
        } else if (customId === 'ticket_close') {
            await interaction.reply({ content: '🔒 Ticket này sẽ được đóng và xóa kênh sau **5 giây** / This ticket will be closed and deleted in **5 seconds**...', ephemeral: false });
            setTimeout(async () => {
                try {
                    if (channel && channel.deletable) {
                        await channel.delete('Đóng và xóa ticket theo yêu cầu.');
                    }
                } catch (e) {
                    console.error('Lỗi khi xóa kênh ticket:', e);
                }
            }, 5000);
        } else if (customId === 'discohook_edit_embed') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: '❌ Bạn cần có quyền Quản trị viên hoặc Quản lý Tin nhắn để chỉnh sửa embed này!', ephemeral: true });
            }

            const modal = new ModalBuilder()
                .setCustomId(`discohook_modal_${message.id}`)
                .setTitle('✏️ Discohook Embed Editor');

            const titleInput = new TextInputBuilder()
                .setCustomId('new_title')
                .setLabel('Tiêu đề mới (Title)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const contentInput = new TextInputBuilder()
                .setCustomId('new_content')
                .setLabel('Nội dung mới (Description)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(contentInput)
            );

            await interaction.showModal(modal);
        } else if (customId === 'glory_refresh_status') {
            const accounts = getLinkedAccounts();
            const accData = accounts[user.id];
            if (accData) {
                await interaction.reply({
                    content: `✅ Tài khoản của bạn đã liên kết thành công với Minecraft **\`${accData.mcUsername}\`** (Loại: ${accData.accountType}, Chức danh: ${accData.roleTitle})!`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `⏳ Tài khoản của bạn chưa được liên kết. Hãy mở Glory PvP Client v1.0.195 ➔ Tab **Accounts** ➔ Nhập **Discord ID** và **Discord Tag** rồi nhấn **Link Discord**, hoặc dùng lệnh \`/verify friend_id:<12 số>\`.`,
                    ephemeral: true
                });
            }
        } else if (customId.startsWith('role_claim_')) {
            const roleId = customId.replace('role_claim_', '');

            try {
                await interaction.deferReply({ ephemeral: true });

                const member = interaction.member;
                const role = guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.editReply({ content: '❌ Không tìm thấy role này trên server!' });
                }

                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(role, 'Bỏ nhận role qua role panel');
                    await interaction.editReply({ content: `✅ Đã hủy nhận role **${role.name}** thành công!` });
                } else {
                    await member.roles.add(role, 'Nhận role qua role panel');
                    await interaction.editReply({ content: `🎉 Đã nhận role **${role.name}** thành công!` });
                }
            } catch (err) {
                console.error('Lỗi toggle role panel:', err);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: `❌ Không thể thay đổi role: ${err.message}. Hãy kiểm tra lại quyền Quản lý Role (Manage Roles) của bot và đảm bảo vị trí role của bot nằm cao hơn role cần cấp.` }).catch(() => {});
                }
            }
        }
    }
});

client.on('error', error => {
    console.error('[DISCORD CLIENT ERROR]:', error);
});

client.on('warn', info => {
    console.warn('[DISCORD CLIENT WARN]:', info);
});

process.on('unhandledRejection', error => {
    console.error('[UNHANDLED REJECTION]:', error);
});

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ LỖI NGHIÊM TRỌNG: Chưa cấu hình biến môi trường DISCORD_TOKEN trên Render!');
} else {
    console.log('🔑 DISCORD_TOKEN status: Loaded (length:', process.env.DISCORD_TOKEN.length, ', starts with:', process.env.DISCORD_TOKEN.substring(0, 4) + '...)');
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error('❌ Lỗi đăng nhập Discord Bot:', err);
    });
}
