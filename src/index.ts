import { Client, GatewayIntentBits, GuildMember, Partials, Invite } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages
  ],
  partials: [Partials.GuildMember],
});

const inviteCache = new Map<string, number>();

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);

  const guilds = await client.guilds.fetch();

  for (const [_, guildPreview] of guilds) {
    const guild = await guildPreview.fetch();
    const invites = await guild.invites.fetch();
    invites.forEach(invite => {
      inviteCache.set(invite.code, invite.uses ?? 0);
    });
  }
});

client.on('guildMemberAdd', async (member: GuildMember) => {
  const invites = await member.guild.invites.fetch();

  const usedInvite = invites.find(inv => {
    const previousUses = inviteCache.get(inv.code) || 0;
    return (inv.uses || 0) > previousUses;
  });

  if (!usedInvite) {
    console.log('❓ Не удалось определить, по какой ссылке зашёл пользователь');
    return;
  }

  inviteCache.set(usedInvite.code, usedInvite.uses || 0);

  console.log(`👤 ${member.user.tag} зашёл по ссылке ${usedInvite.code} от ${usedInvite.inviter?.tag}`);

// Загружаем JSON из .env
  const rawMap = process.env.INVITE_ROLE_MAP;
  let inviteCodeToRoleId: Record<string, string> = {};

  try {
    if (rawMap) inviteCodeToRoleId = JSON.parse(rawMap);
  } catch (err) {
    console.error('❌ Ошибка при парсинге INVITE_ROLE_MAP из .env:', err);
    return;
  }
  const roleId = inviteCodeToRoleId[usedInvite.code];

  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);
    if (role) {
      await member.roles.add(role);
      console.log(`✅ Роль ${role.name} выдана ${member.user.tag}`);
    }
  }
});

client.login(process.env.TOKEN);
