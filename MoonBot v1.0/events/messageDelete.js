const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageDelete',
    async execute(message) {
        // Bot mesajlarını ve DM mesajlarını yoksay
        if (message.author?.bot || !message.guild) return;

        try {
            const { client, guild, channel, author, content, attachments } = message;
            
            // ModLog ayarlarını kontrol et
            const logSettings = await getModLogSettings(client, guild.id);
            
            // Mesaj silme log aktif değilse çık
            if (!logSettings || !logSettings.message_delete) return;
            
            // Log kanalını al
            const logChannel = guild.channels.cache.get(logSettings.channelId);
            if (!logChannel) return;
            
            // Embed handler'ı import et
            const embedHandler = require('../util/embedHandler')(client);
            
            // İçerik maksimum uzunluğu kontrol
            let truncatedContent = content;
            if (content && content.length > 1024) {
                truncatedContent = content.substring(0, 1021) + '...';
            }

            // Mesaj içeriği boşsa veya null ise
            if (!truncatedContent || truncatedContent.trim() === '') {
                truncatedContent = '*İçerik yok*';
            }
            
            // Attachment varsa ekle
            const attachmentsList = [...attachments.values()];
            const attachmentText = attachmentsList.length > 0 
                ? attachmentsList.map(a => `[${a.name}](${a.url})`).join('\n')
                : '*Ek yok*';
            
            const embed = embedHandler.errorEmbed(
                'Mesaj Silindi',
                `**Mesajı Silen:** ${author}\n` +
                `**Kullanıcı ID:** ${author.id}\n` +
                `**Kanal:** ${channel}`
            )
            .setThumbnail(author.displayAvatarURL())
            .addFields(
                { name: 'Mesaj İçeriği', value: truncatedContent },
                { name: 'Ekler', value: attachmentText }
            )
            .setFooter({ text: `Silinen Mesaj ID: ${message.id}` });
            
            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Mesaj silme log hatası: ${error.message}`));
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
