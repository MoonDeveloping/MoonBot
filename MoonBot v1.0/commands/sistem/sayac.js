const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayaç')
        .setDescription('Sunucu üye sayacı sistemini yönetir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Sayaç sistemini ayarlar')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Sayaç mesajlarının gönderileceği kanal')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('hedef')
                        .setDescription('Hedef üye sayısı')
                        .setMinValue(1)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('katilma_mesaj')
                        .setDescription('Üye katılma mesajı. {user}, {server}, {count}, {target}, {left} kullanılabilir')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('ayrilma_mesaj')
                        .setDescription('Üye ayrılma mesajı. {user}, {server}, {count}, {target}, {left} kullanılabilir')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('katilma_renk')
                        .setDescription('Katılma mesajı embed rengi (HEX formatında, örn: #00ff00)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('ayrilma_renk')
                        .setDescription('Ayrılma mesajı embed rengi (HEX formatında, örn: #ff0000)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Mevcut sayaç ayarlarını gösterir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('Sayaç sistemini sıfırlar')),

    async execute(interaction) {
        try {
            const { options, client, guild } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const subcommand = options.getSubcommand();
            const guildID = guild.id;

            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;

            if (subcommand === 'ayarla') {
                const channel = options.getChannel('kanal');
                const targetCount = options.getInteger('hedef');
                
                // Üye hedefi kontrolü
                if (targetCount <= guild.memberCount) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Hedef üye sayısı, mevcut sunucu üye sayısından (${guild.memberCount}) büyük olmalıdır.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                const joinMessage = options.getString('katilma_mesaj') || 
                    `> ${emoji.human} **{user}** katıldı! **{count}** kişi olduk. **{target}** kişiye ulaşmamıza **{left}** kişi kaldı.`;
                const leaveMessage = options.getString('ayrilma_mesaj') || 
                    `> ${emoji.human} **{user}** ayrıldı! **{count}** kişi kaldık. **{target}** kişiye ulaşmamıza **{left}** kişi kaldı.`;
                const joinColor = options.getString('katilma_renk') || '#5768ea';
                const leaveColor = options.getString('ayrilma_renk') || '#c65b62';

                // Renk formatı kontrolü
                const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                if ((joinColor && !colorRegex.test(joinColor)) || (leaveColor && !colorRegex.test(leaveColor))) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Geçersiz renk formatı. HEX formatında olmalıdır. Örn: #00ff00\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Kanal izinleri kontrolü
                if (!channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Belirtilen kanalda mesaj gönderme, görüntüleme veya embed gönderme iznim yok.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                if (useMySQL) {
                    try {
                        // MySQL veritabanını kullan
                        const existing = await client.db.select('counter', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.update('counter', 
                                { 
                                    channel_id: channel.id, 
                                    target_count: targetCount,
                                    join_message: joinMessage,
                                    leave_message: leaveMessage,
                                    join_color: joinColor,
                                    leave_color: leaveColor
                                }, 
                                { guild_id: guildID }
                            );
                        } else {
                            await client.db.insert('counter', {
                                guild_id: guildID,
                                channel_id: channel.id,
                                target_count: targetCount,
                                join_message: joinMessage,
                                leave_message: leaveMessage,
                                join_color: joinColor,
                                leave_color: leaveColor
                            });
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                    
                    }
                } else {
                    // Yerel veritabanını kullan
                    localDBHandler.insertData('sayac_kanal', `kanal_${guildID}`, channel.id);
                    localDBHandler.insertData('sayac_mesaj', `hedef_${guildID}`, targetCount);
                    localDBHandler.insertData('sayac_mesaj', `katilma_${guildID}`, joinMessage);
                    localDBHandler.insertData('sayac_mesaj', `ayrilma_${guildID}`, leaveMessage);
                    localDBHandler.insertData('sayac_mesaj', `katilma_renk_${guildID}`, joinColor);
                    localDBHandler.insertData('sayac_mesaj', `ayrilma_renk_${guildID}`, leaveColor);
                }

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`Sayaç sistemi başarıyla ayarlandı!\`\n> \`Kanal: ${channel.name}\`\n> \`Hedef: ${targetCount}\``
                );

                return interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'bilgi') {
                // Mevcut sayaç ayarlarını göster
                let channelId, targetCount, joinMessage, leaveMessage;
                
                if (useMySQL) {
                    try {
                        const results = await client.db.select('counter', { guild_id: guildID });
                        if (results && results.length > 0) {
                            channelId = results[0].channel_id;
                            targetCount = results[0].target_count;
                            joinMessage = results[0].join_message;
                            leaveMessage = results[0].leave_message;
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL okuma hatası: ${dbError.message}`));
                    }
                } else {
                    // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
                    channelId = client.localDB.getData("sayac_kanal", `kanal_${guildID}`);
                    targetCount = client.localDB.getData("sayac_mesaj", `hedef_${guildID}`);
                    joinMessage = client.localDB.getData("sayac_mesaj", `katilma_${guildID}`);
                    leaveMessage = client.localDB.getData("sayac_mesaj", `ayrilma_${guildID}`);
                }
                
                if (!channelId || !targetCount) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Bilgi:`,
                        `> \`Bu sunucu için sayaç ayarlanmamış.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                const channel = guild.channels.cache.get(channelId);
                const currentCount = guild.memberCount;
                const leftToTarget = targetCount - currentCount;
                
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.info} Sayaç Bilgileri`,
                    `> \`Kanal: ${channel ? channel.name : 'Bilinmiyor'}\`\n` +
                    `> \`Mevcut Üye: ${currentCount}\`\n` +
                    `> \`Hedef Üye: ${targetCount}\`\n` +
                    `> \`Kalan Üye: ${leftToTarget}\`\n\n` +
                    `**Katılma Mesajı:**\n${joinMessage}\n\n` +
                    `**Ayrılma Mesajı:**\n${leaveMessage}`
                );
                
                return interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    try {
                        await client.db.delete('counter', { guild_id: guildID });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL silme hatası: ${dbError.message}`));
                    }
                } else {
                    localDBHandler.deleteData('sayac_kanal', `kanal_${guildID}`);
                    localDBHandler.deleteData('sayac_mesaj', `hedef_${guildID}`);
                    localDBHandler.deleteData('sayac_mesaj', `katilma_${guildID}`);
                    localDBHandler.deleteData('sayac_mesaj', `ayrilma_${guildID}`);
                    localDBHandler.deleteData('sayac_mesaj', `katilma_renk_${guildID}`);
                    localDBHandler.deleteData('sayac_mesaj', `ayrilma_renk_${guildID}`);    
                }
                
                // Her durumda yerel veritabanından da sil
               
                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`Sayaç sistemi başarıyla sıfırlandı!\``
                );

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Sayaç komutu hatası:', error);
            
            // Hata durumunda embedHandler oluştur
            let embedHandler;
            try {
                embedHandler = require('../../util/embedHandler')(interaction.client);
            } catch (embErr) {
                // Fallback embed yanıtı
                return interaction.reply({ 
                    content: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.", 
                    ephemeral: true 
                });
            }
            
            const errorEmbed = embedHandler.errorEmbed(
                `> ${emoji.close} Hata:`,
                `> \`Bir hata oluştu. Lütfen daha sonra tekrar deneyin.\``
            );
            
            // Ensure interaction is replied to even if an error occurs
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
