const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const linkedAccountsFile = path.join(__dirname, 'linkedAccounts.json');

const LinkedAccountSchema = new mongoose.Schema({
    discordId: { type: String, required: true, unique: true },
    discordTag: { type: String },
    mcUsername: { type: String, required: true },
    mcUuid: { type: String },
    accountType: { type: String, default: 'Crack / Offline' },
    hasGloryKey: { type: Boolean, default: false },
    roleTitle: { type: String, default: 'Member' },
    linkedAt: { type: Date, default: Date.now }
});

const LinkedAccountModel = mongoose.model('LinkedAccount', LinkedAccountSchema);

let inMemoryAccounts = {};

async function initDB() {
    try {
        if (fs.existsSync(linkedAccountsFile)) {
            inMemoryAccounts = JSON.parse(fs.readFileSync(linkedAccountsFile, 'utf8'));
        }
    } catch (e) {
        console.error('[DB] Error loading local linkedAccounts.json:', e);
    }

    if (process.env.MONGO_URI) {
        try {
            await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
            console.log('[DB] Connected to MongoDB successfully.');
            
            const docs = await LinkedAccountModel.find({});
            for (const doc of docs) {
                inMemoryAccounts[doc.discordId] = {
                    discordId: doc.discordId,
                    discordTag: doc.discordTag,
                    mcUsername: doc.mcUsername,
                    mcUuid: doc.mcUuid,
                    accountType: doc.accountType,
                    hasGloryKey: doc.hasGloryKey,
                    roleTitle: doc.roleTitle,
                    linkedAt: doc.linkedAt ? doc.linkedAt.toISOString() : new Date().toISOString()
                };
            }
            fs.writeFileSync(linkedAccountsFile, JSON.stringify(inMemoryAccounts, null, 2), 'utf8');
            console.log(`[DB] Synced ${docs.length} accounts from MongoDB.`);
        } catch (err) {
            console.error('[DB] MongoDB connection failed, falling back to local JSON:', err.message);
        }
    } else {
        console.log('[DB] MONGO_URI not found. Using local JSON storage.');
    }
}

function getAccounts() {
    return inMemoryAccounts;
}

async function saveAccount(discordId, data) {
    inMemoryAccounts[discordId] = data;
    try {
        fs.writeFileSync(linkedAccountsFile, JSON.stringify(inMemoryAccounts, null, 2), 'utf8');
    } catch (e) {}

    if (mongoose.connection.readyState === 1) {
        try {
            await LinkedAccountModel.findOneAndUpdate(
                { discordId },
                {
                    discordId: data.discordId,
                    discordTag: data.discordTag,
                    mcUsername: data.mcUsername,
                    mcUuid: data.mcUuid || data.mcUsername,
                    accountType: data.accountType,
                    hasGloryKey: data.hasGloryKey,
                    roleTitle: data.roleTitle,
                    linkedAt: data.linkedAt ? new Date(data.linkedAt) : new Date()
                },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error('[DB] Error saving to MongoDB:', err.message);
        }
    }
}

async function removeAccount(discordId) {
    delete inMemoryAccounts[discordId];
    try {
        fs.writeFileSync(linkedAccountsFile, JSON.stringify(inMemoryAccounts, null, 2), 'utf8');
    } catch (e) {}

    if (mongoose.connection.readyState === 1) {
        try {
            await LinkedAccountModel.deleteOne({ discordId });
        } catch (err) {
            console.error('[DB] Error deleting from MongoDB:', err.message);
        }
    }
}

module.exports = { initDB, getAccounts, saveAccount, removeAccount };
