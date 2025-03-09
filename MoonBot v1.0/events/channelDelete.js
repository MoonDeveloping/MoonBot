const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    name: 'channelDelete',
    async execute(channel) {
        // DM kanallarını yoksay
        if (!channel.guild) return;

        try {
            const { client, guild } = channel;
            
            // ModLog ayarlarını kontrol et
            const logSettings = await getModLogSettings(client, guild.id);
            
            // Kanal silme log aktif değilse çık
            if (!logSettings || !logSettings.channel_delete) return;
            
            // Log kanalını al
            const logChannel = guild.channels.cache.get(logSettings.channelId);
            if (!logChannel) return;
            
            // Embed handler'ı import et
            const embedHandler = require('../util/embedHandler')(client);
            
            // Kanal tipi ve adını belirle
            let channelType = 'Bilinmiyor';
            
            if (channel.type === ChannelType.GuildText) channelType = 'Yazı Kanalı';
            else if (channel.type === ChannelType.GuildVoice) channelType = 'Ses Kanalı';
            else if (channel.type === ChannelType.GuildCategory) channelType = 'Kategori';
            else if (channel.type === ChannelType.GuildAnnouncement) channelType = 'Duyuru Kanalı';
            else if (channel.type === ChannelType.GuildStageVoice) channelType = 'Sahne Kanalı';
            else if (channel.type === ChannelType.GuildForum) channelType = 'Forum Kanalı';
            else if (channel.type === ChannelType.PublicThread || channel.type === ChannelType.PrivateThread) channelType = 'Thread';
            
            const embed = embedHandler.errorEmbed(
                'Kanal Silindi',
                `**Kanal Adı:** ${channel.name}\n` +
                `**Kanal ID:** ${channel.id}\n` +
                `**Kanal Türü:** ${channelType}`
            );
            
            // Kategori bilgisini ekle
            if (channel.parent) {
                embed.addFields({ name: '📁 Kategori', value: channel.parent.name });
            }
            
            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Kanal silme log hatası: ${error.message}`));
        }
    }
};

// ModLog ayarlarını getiren fonksiyon
async function getModLogSettings(client, guildId) {
    try {
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let settings = null;
        
        if (useMySQL) {
            try {
                const results = await client.db.select('modlog', { guild_id: guildId });
                if (results && results.length > 0) {
                    settings = {
                        channelId: results[0].channel_id,
                        message_delete: results[0].message_delete === 1,
                        message_edit: results[0].message_edit === 1,
                        channel_create: results[0].channel_create === 1,
                        channel_delete: results[0].channel_delete === 1,
                        role_create: results[0].role_create === 1,
                        role_delete: results[0].role_delete === 1
                    };
                }
            } catch (err) {
                console.error(global.hata(`ModLog MySQL sorgu hatası: ${err.message}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            const channelId = client.localDB.getData("modlog_kanal", `kanal_${guildId}`);
            if (channelId) {
                settings = {
                    channelId: channelId,
                    message_delete: client.localDB.getData("modlog_ayarlar", `mesaj_silme_${guildId}`) === true,
                    message_edit: client.localDB.getData("modlog_ayarlar", `mesaj_duzenleme_${guildId}`) === true,
                    channel_create: client.localDB.getData("modlog_ayarlar", `kanal_olusturma_${guildId}`) === true,
                    channel_delete: client.localDB.getData("modlog_ayarlar", `kanal_silme_${guildId}`) === true,
                    role_create: client.localDB.getData("modlog_ayarlar", `rol_olusturma_${guildId}`) === true,
                    role_delete: client.localDB.getData("modlog_ayarlar", `rol_silme_${guildId}`) === true
                };
            }
        }
        
        return settings;
    } catch (error) {
        console.error(global.hata(`ModLog ayarları alınırken hata: ${error.message}`));
        return null;
    }
}
