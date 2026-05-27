const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
let client = null;
let targetUserId = null;
let ready = false;

async function init() {
  if (!TOKEN) {
    console.log('[Discord] No DISCORD_TOKEN env var, skipping Discord notification setup.');
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.on('ready', async () => {
    console.log(`[Discord] Logged in as ${client.user.tag}`);

    for (const guild of client.guilds.cache.values()) {
      try {
        const members = await guild.members.fetch({ query: 'uni298', limit: 1 });
        if (members.size > 0) {
          targetUserId = members.first().id;
          console.log(`[Discord] Found target user uni298 (${targetUserId}) in guild ${guild.name}`);
          break;
        }
      } catch (e) {
        // skip guild
      }
    }

    if (!targetUserId) {
      console.log('[Discord] Could not find user uni298 in any shared guild.');
    }
    ready = true;
  });

  try {
    await client.login(TOKEN);
  } catch (e) {
    console.error('[Discord] Login failed:', e.message);
  }
}

async function notifyOnline(tetrixUsername) {
  if (!ready || !targetUserId || !client) return;
  try {
    const user = await client.users.fetch(targetUserId);
    await user.send(`**${tetrixUsername}** just came online in TETRIX!`);
  } catch (e) {
    console.error('[Discord] Failed to send DM:', e.message);
  }
}

module.exports = { init, notifyOnline };
