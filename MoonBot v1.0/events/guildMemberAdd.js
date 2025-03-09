const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const { client, guild } = member;
        
        try {
            // Otorol sistemi için
            handleAutoRole(member);
            
            // HG/BB sistemi için
            handleWelcomeMessage(member);
            
            // Sayaç sistemi için
            handleCounterMessage(member, true);
            
            // Kayıt sistemi için
            handleRegistrationButtons(member);
        } catch (error) {
            console.error(global.hata(`GuildMemberAdd olay hatası: ${error.message}`));
        }
    },
};

// Otorol işlemini gerçekleştiren fonksiyon
async function handleAutoRole(member) {
    const { client, guild } = member;
    
    try {
        // Veritabanı kontrolü 
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let roleId, channelId, welcomeMessage, embedColor;
        
        if (useMySQL) {
            try {
                // MySQL'den otorol verilerini al
                const results = await client.db.select('autoroles', { guild_id: guild.id });
                
                if (results && results.length > 0) {
                    roleId = results[0].role_id;
                    channelId = results[0].channel_id;
                    welcomeMessage = results[0].welcome_message;
                    embedColor = results[0].embed_color || '#5768ea';
                }
            } catch (err) {
                console.error(global.hata(`Otorol verileri alınırken MySQL hatası: ${err}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            roleId = client.localDB.getData("otorol_rol", `rol_${guild.id}`);
            channelId = client.localDB.getData("otorol_kanal", `kanal_${guild.id}`);
            welcomeMessage = client.localDB.getData("otorol_mesaj", `mesaj_${guild.id}`);
            embedColor = client.localDB.getData("otorol_mesaj", `renk_${guild.id}`) || '#5768ea';
        }
        
        // Otorol ayarlanmamışsa işlemi sonlandır
        if (!roleId || !channelId) {
            return;
        }
        
        // Rol ve kanal kontrolü
        const role = await guild.roles.fetch(roleId).catch(() => null);
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        
        if (!role || !channel) {
            return;
        }
        
        // Üyeye rol ver
        try {
            await member.roles.add(role);
            
            // Default hoş geldin mesajı, eğer mesaj tanımlı değilse
            if (!welcomeMessage) {
                welcomeMessage = `> Merhaba {user}! **${guild.name}** sunucusuna hoş geldin!\n> 🎭 **${role.name}** rolü otomatik olarak verildi.`;
            }
            
            // Mesajdaki yer tutucuları değiştir
            const formattedMessage = welcomeMessage
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{server}/g, guild.name)
                .replace(/{role}/g, `<@&${role.id}>`);
            
            // Embed oluştur
            const embedHandler = require('../util/embedHandler')(client);
            const embed = embedHandler.successEmbed(
                'Yeni Üye!', 
                formattedMessage
            ).setColor(embedColor).setThumbnail(member.user.displayAvatarURL());
            
            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Rol verme veya mesaj gönderme hatası: ${error.message}`));
        }
    } catch (error) {
        console.error(global.hata(`Otorol işlemi hatası: ${error.message}`));
    }
}

// Hoşgeldin mesajını gönderen fonksiyon
async function handleWelcomeMessage(member) {
    const { client, guild } = member;
    
    try {
        // Veritabanı kontrolü
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let channelId, welcomeMessage, welcomeColor;
        
        if (useMySQL) {
            try {
                // MySQL'den HG/BB verilerini al
                const results = await client.db.select('welcome_leave', { guild_id: guild.id });
                
                if (results && results.length > 0) {
                    channelId = results[0].channel_id;
                    welcomeMessage = results[0].welcome_message;
                    welcomeColor = results[0].welcome_color || '#00ff00';
                }
            } catch (err) {
                console.error(global.hata(`HG/BB verileri alınırken MySQL hatası: ${err}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            channelId = client.localDB.getData("hgbb_kanal", `kanal_${guild.id}`);
            welcomeMessage = client.localDB.getData("hgbb_mesaj", `hosgeldin_${guild.id}`);
            welcomeColor = client.localDB.getData("hgbb_mesaj", `hosgeldin_renk_${guild.id}`) || '#00ff00';
        }
        
        // HG/BB ayarlanmamışsa işlemi sonlandır
        if (!channelId || !welcomeMessage) {
            return;
        }
        
        // Kanal kontrolü
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        
        if (!channel) {
            return;
        }
        
        try {
            // Mesajdaki yer tutucuları değiştir
            const formattedMessage = welcomeMessage
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{server}/g, guild.name)
                .replace(/{memberCount}/g, guild.memberCount);
            
            // Embed oluştur
            const embedHandler = require('../util/embedHandler')(client);
            const embed = embedHandler.infoEmbed(
                'Hoş Geldin!', 
                formattedMessage
            ).setColor(welcomeColor).setThumbnail(member.user.displayAvatarURL());
            
            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Hoşgeldin mesajı gönderme hatası: ${error.message}`));
        }
    } catch (error) {
        console.error(global.hata(`Hoşgeldin mesajı işlemi hatası: ${error.message}`));
    }
}

// Sayaç mesajını gönderen fonksiyon
async function handleCounterMessage(member, isJoin = true) {
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
                .replace(/{user}/g, isJoin ? `<@${member.id}>` : member.user.tag)
                .replace(/{server}/g, guild.name)
                .replace(/{count}/g, currentCount)
                .replace(/{target}/g, targetCount)
                .replace(/{left}/g, leftToTarget);
            
            // Embed oluştur
            const embedHandler = require('../util/embedHandler')(client);
            const embedMethod = isJoin ? 'successEmbed' : 'errorEmbed';
            const title = isJoin ? 'Üye Sayacı | Katılım' : 'Üye Sayacı | Ayrılma';
            
            const embed = embedHandler[embedMethod](title, formattedMessage)
                .setColor(color)
                .setThumbnail(member.user.displayAvatarURL());
            
            // Hedefe ulaşıldı mı?
            if (isJoin && currentCount >= targetCount) {
                embed.addFields({
                    name: '🎉 Tebrikler!',
                    value: `Hedef üye sayısına ulaştınız! (${targetCount})`
                });
            }
            
            await channel.send({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Sayaç mesajı gönderme hatası: ${error.message}`));
        }
    } catch (error) {
        console.error(global.hata(`Sayaç işlemi hatası: ${error.message}`));
    }
}

// Kayıt butonlarını ekleyen fonksiyon
async function handleRegistrationButtons(member) {
    const { client, guild, user } = member;
    
    try {
        // Veritabanı kontrolü
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let registerSettings = null;
        
        if (useMySQL) {
            try {
                const results = await client.db.select('register_settings', { guild_id: guild.id });
                if (results && results.length > 0) {
                    registerSettings = results[0];
                }
            } catch (err) {
                console.error(global.hata(`Kayıt ayarları alınırken MySQL hatası: ${err.message}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            const staffRoleId = client.localDB.getData("register_settings", `staff_role_id_${guild.id}`);
            
            if (staffRoleId) {
                registerSettings = {
                    staff_role_id: staffRoleId,
                    register_channel_id: client.localDB.getData("register_settings", `register_channel_id_${guild.id}`),
                    log_channel_id: client.localDB.getData("register_settings", `log_channel_id_${guild.id}`),
                    member_role_id: client.localDB.getData("register_settings", `member_role_id_${guild.id}`),
                    male_role_id: client.localDB.getData("register_settings", `male_role_id_${guild.id}`),
                    female_role_id: client.localDB.getData("register_settings", `female_role_id_${guild.id}`)
                };
            }
        }
        
        // Kayıt sistemi aktif değilse çık
        if (!registerSettings || !registerSettings.register_channel_id) {
            return;
        }
        
        // Kayıt kanalını al
        const registerChannel = await guild.channels.fetch(registerSettings.register_channel_id).catch(() => null);
        if (!registerChannel) return;
        
        // Emojileri al
        const emoji = require('../util/emoji');

        // Kullanıcının hesap oluşturma tarihini formatla
        const createdAt = user.createdAt;
        const day = createdAt.getDate().toString().padStart(2, '0');
        const month = (createdAt.getMonth() + 1).toString().padStart(2, '0');
        const year = createdAt.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        
        // Hesap 2 aydan eski mi kontrolü
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const isTrusted = user.createdAt < twoMonthsAgo;
        const trustStatus = isTrusted ? `Güvenilir` : `Güvenilir Değil`;
        
        // Kayıt embed'i oluştur
        const registerEmbed = new EmbedBuilder()
            .setTitle(`${emoji.human || '👤'} Kayıt İşlemi`)
            .setDescription(
                `Hoş geldin ${user}!\n\n` +
                `Bir yetkili en kısa sürede kayıt işlemini tamamlayacaktır.`
            )
            .setColor('#5768ea')
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: `${emoji.clock} Hesap Oluşturma Tarihi`, value: `\`${formattedDate}\``, inline: true },
                { name: `${emoji.guard} Güvenilirlik Durumu`, value: `\`${trustStatus}\``, inline: true }
            )
            .setFooter({ 
                text: `${guild.name} • Kayıt Sistemi`, 
                iconURL: guild.iconURL() 
            })
            .setTimestamp();
            
        // Butonları oluştur
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`register_normal_${user.id}`)
                .setLabel('Normal Üye Kaydı Yap')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji.done2 || '✅'),
            new ButtonBuilder()
                .setCustomId(`register_male_${user.id}`)
                .setLabel('Erkek Üye Kaydı Yap')
                .setDisabled(!registerSettings.male_role_id)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji.man || '👨'),
            new ButtonBuilder()
                .setCustomId(`register_female_${user.id}`)
                .setLabel('Kız Üye Kaydı Yap')
                .setDisabled(!registerSettings.female_role_id)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(emoji.woman || '👩')
        );

        // Aktif kayıt yetkililerini bul ve etiketleme metni oluştur
        let staffMentions = '';
        try {
            // Rol ID'sini kullanarak rol nesnesini al
            const staffRole = await guild.roles.fetch(registerSettings.staff_role_id);
            
            if (staffRole) {
                // Rol üyelerini alın ve çevrimiçi olanları filtrele
                const staffMembers = staffRole.members.filter(m => 
                    m.presence?.status === 'online' || 
                    m.presence?.status === 'idle' || 
                    m.presence?.status === 'dnd'
                );
                
                if (staffMembers.size > 0) {
                    // Maksimum 5 yetkili etiketle
                    const mentions = staffMembers.first(5).map(m => `<@${m.id}>`).join(', ');
                    staffMentions = `Aktif Yetkililer: ${mentions}`;
                } else {
                    // Hiç aktif yetkili yoksa tüm yetkili rolünü etiketle
                    staffMentions = `<@&${registerSettings.staff_role_id}>`;
                }
            } else {
                // Rol bulunamazsa genel bir etiket kullan
                staffMentions = `<@&${registerSettings.staff_role_id}>`;
            }
        } catch (err) {
            console.error(global.hata(`Yetkilileri etiketleme hatası: ${err.message}`));
            staffMentions = `<@&${registerSettings.staff_role_id}>`;
        }
            
        // Kayıt kanalına mesajı gönder
        await registerChannel.send({
            content: `${staffMentions}, yeni üye katıldı!`,
            embeds: [registerEmbed],
            components: [row]
        });
        
    } catch (error) {
        console.error(global.hata(`Kayıt butonları oluşturulurken hata: ${error.message}`));
    }
}
