const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage) {
        // Bot mesajlarını ve DM mesajlarını yoksay
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        
        // İçerik değişmemişse (sadece embed gibi şeyler değişmişse) yoksay
        if (oldMessage.content === newMessage.content) return;

        try {
            const { client, guild, channel, author } = oldMessage;
            
            // ModLog ayarlarını kontrol et
            const logSettings = await getModLogSettings(client, guild.id);
            
            // Mesaj düzenleme log aktif değilse çık
            if (!logSettings || !logSettings.message_edit) return;
            
            // Log kanalını al
            const logChannel = guild.channels.cache.get(logSettings.channelId);
            if (!logChannel) return;
            
            // Embed handler'ı import et
            const embedHandler = require('../util/embedHandler')(client);
            
            // İçerik maksimum uzunluğu kontrol
            let oldContent = oldMessage.content;
            let newContent = newMessage.content;
            
            if (oldContent && oldContent.length > 1024) {
                oldContent = oldContent.substring(0, 1021) + '...';
            }
            
            if (newContent && newContent.length > 1024) {
                newContent = newContent.substring(0, 1021) + '...';
            }

            // İçerik boşsa
            if (!oldContent || oldContent.trim() === '') {
                oldContent = '*İçerik yok*';
            }
            
            if (!newContent || newContent.trim() === '') {
                newContent = '*İçerik yok*';
            }
            
            const embed = embedHandler.infoEmbed(
                'Mesaj Düzenlendi',
                `**Mesaj Sahibi:** ${author}\n` +
                `**Kullanıcı ID:** ${author.id}\n` +
                `**Kanal:** ${channel}\n` +
                `[Mesaja Git](${newMessage.url})`
            )
            .setThumbnail(author.displayAvatarURL())
            .addFields(
                { name: 'Eski İçerik', value: oldContent },
                { name: 'Yeni İçerik', value: newContent }
            )
            .setFooter({ text: `Mesaj ID: ${newMessage.id}` });
            
            await logChannel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Mesaj düzenleme log hatası: ${error.message}`));
        }
    }
};

// ModLog ayarlarını getiren fonksiyon (Bu fonksiyon tüm event dosyalarında tekrarlanacak)
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
