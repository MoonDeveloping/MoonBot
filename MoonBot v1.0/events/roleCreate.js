const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roleCreate',
    async execute(role) {
        try {
            const { client, guild } = role;
            
            // ModLog ayarlarını kontrol et
            const logSettings = await getModLogSettings(client, guild.id);
            
            // Rol oluşturma log aktif değilse çık
            if (!logSettings || !logSettings.role_create) return;
            
            // Log kanalını al
            const logChannel = guild.channels.cache.get(logSettings.channelId);
            if (!logChannel) return;
            
            // Embed handler'ı import et
            const embedHandler = require('../util/embedHandler')(client);
            
            // Rol bilgilerini topla
            const roleMention = role.toString();
            const roleName = role.name;
            const roleID = role.id;
            const roleColor = role.hexColor;
            const rolePosition = role.position;
            const roleMentionable = role.mentionable ? 'Evet' : 'Hayır';
            const roleHoist = role.hoist ? 'Evet' : 'Hayır';
            
            const embed = embedHandler.successEmbed(
                'Rol Oluşturuldu',
                `**Rol:** ${roleMention}\n` +
                `**Rol Adı:** ${roleName}\n` +
                `**Rol ID:** ${roleID}`
            )
            .setColor(roleColor)
            .addFields(
                { name: 'Renk', value: roleColor, inline: true },
                { name: 'Pozisyon', value: rolePosition.toString(), inline: true },
                { name: 'Bahsedilebilir', value: roleMentionable, inline: true },
                { name: 'Üye Listesinde Göster', value: roleHoist, inline: true }
            );
            
            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Rol oluşturma log hatası: ${error.message}`));
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
