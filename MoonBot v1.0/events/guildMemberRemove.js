const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const { client, guild } = member;
        
        try {
            // Hoşçakal mesajı için
            handleGoodbyeMessage(member);
            
            // Sayaç sistemi için
            handleCounterMessage(member, false);
        } catch (error) {
            console.error(global.hata(`GuildMemberRemove olay hatası: ${error.message}`));
        }
    },
};

// Hoşçakal mesajını gönderen fonksiyon
async function handleGoodbyeMessage(member) {
    const { client, guild } = member;
    
    try {
        // Veritabanı kontrolü
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let channelId, leaveMessage, leaveColor;
        
        if (useMySQL) {
            try {
                // MySQL'den HG/BB verilerini al
                const results = await client.db.select('welcome_leave', { guild_id: guild.id });
                
                if (results && results.length > 0) {
                    channelId = results[0].channel_id;
                    leaveMessage = results[0].leave_message;
                    leaveColor = results[0].leave_color || '#ff0000';
                }
            } catch (err) {
                console.error(global.hata(`HG/BB verileri alınırken MySQL hatası: ${err}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            channelId = client.localDB.getData("hgbb_kanal", `kanal_${guild.id}`);
            leaveMessage = client.localDB.getData("hgbb_mesaj", `gulegule_${guild.id}`);
            leaveColor = client.localDB.getData("hgbb_mesaj", `gulegule_renk_${guild.id}`) || '#ff0000';
        }
        
        // HG/BB ayarlanmamışsa işlemi sonlandır
        if (!channelId || !leaveMessage) {
            return;
        }
        
        // Kanal kontrolü
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        
        if (!channel) {
            return;
        }
        
        try {
            // Mesajdaki yer tutucuları değiştir
            const formattedMessage = leaveMessage
                .replace(/{user}/g, member.user.tag)
                .replace(/{server}/g, guild.name)
                .replace(/{memberCount}/g, guild.memberCount);
            
            // Embed oluştur
            const embedHandler = require('../util/embedHandler')(client);
            const embed = embedHandler.errorEmbed(
                '👋 Güle Güle!', 
                formattedMessage
            ).setColor(leaveColor).setThumbnail(member.user.displayAvatarURL());
            
            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Güle güle mesajı gönderme hatası: ${error.message}`));
        }
    } catch (error) {
        console.error(global.hata(`Güle güle işlemi hatası: ${error.message}`));
    }
}

// Sayaç mesajını gönderen fonksiyon
async function handleCounterMessage(member, isJoin = false) {
    const { client, guild } = member;
    
    try {
        // Veritabanı kontrolü
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let channelId, targetCount, joinMessage, leaveMessage, joinColor, leaveColor;
        
        if (useMySQL) {
            try {
                // MySQL'den sayaç verilerini al
                const results = await client.db.select('counter', { guild_id: guild.id });
                
                if (results && results.length > 0) {
                    channelId = results[0].channel_id;
                    targetCount = results[0].target_count;
                    joinMessage = results[0].join_message;
                    leaveMessage = results[0].leave_message;
                    joinColor = results[0].join_color || '#5768ea';
                    leaveColor = results[0].leave_color || '#c65b62';
                }
            } catch (err) {
                console.error(global.hata(`Sayaç verileri alınırken MySQL hatası: ${err}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            channelId = client.localDB.getData("sayac_kanal", `kanal_${guild.id}`);
            targetCount = client.localDB.getData("sayac_mesaj", `hedef_${guild.id}`);
            joinMessage = client.localDB.getData("sayac_mesaj", `katilma_${guild.id}`);
            leaveMessage = client.localDB.getData("sayac_mesaj", `ayrilma_${guild.id}`);
            joinColor = client.localDB.getData("sayac_mesaj", `katilma_renk_${guild.id}`) || '#5768ea';
            leaveColor = client.localDB.getData("sayac_mesaj", `ayrilma_renk_${guild.id}`) || '#c65b62';
        }
        
        // Sayaç ayarlanmamışsa işlemi sonlandır
        if (!channelId || !targetCount) {
            return;
        }
        
        // Kanal kontrolü
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        
        if (!channel) {
            return;
        }
        
        try {
            const currentCount = guild.memberCount;
            const leftToTarget = targetCount - currentCount;
            
            // Hangi mesaj ve renk kullanılacak?
            const message = isJoin ? joinMessage : leaveMessage;
            const color = isJoin ? joinColor : leaveColor;
            
            // Default mesaj
            if (!message) {
                return;
            }
            
            // Mesajdaki yer tutucuları değiştir
            const formattedMessage = message
                .replace(/{user}/g, member.user.tag)
                .replace(/{server}/g, guild.name)
                .replace(/{count}/g, currentCount)
                .replace(/{target}/g, targetCount)
                .replace(/{left}/g, leftToTarget);
            
            // Embed oluştur
            const embedHandler = require('../util/embedHandler')(client);
            const embedMethod = isJoin ? 'successEmbed' : 'errorEmbed';
            const title = isJoin ? '📈 Üye Sayacı | Katılım' : '📉 Üye Sayacı | Ayrılma';
            
            const embed = embedHandler[embedMethod](title, formattedMessage)
                .setColor(color)
                .setThumbnail(member.user.displayAvatarURL());
            
            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Sayaç mesajı gönderme hatası: ${error.message}`));
        }
    } catch (error) {
        console.error(global.hata(`Sayaç işlemi hatası: ${error.message}`));
    }
}
