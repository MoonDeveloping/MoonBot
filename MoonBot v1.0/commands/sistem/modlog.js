const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Sunucu olay kayıtlarını tutar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('ModLog sistemini ayarlar')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Log mesajlarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('mesaj_silme')
                        .setDescription('Mesaj silme olaylarını logla')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('mesaj_düzenleme')
                        .setDescription('Mesaj düzenleme olaylarını logla')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('kanal_oluşturma')
                        .setDescription('Kanal oluşturma olaylarını logla')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('kanal_silme')
                        .setDescription('Kanal silme olaylarını logla')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('rol_oluşturma')
                        .setDescription('Rol oluşturma olaylarını logla')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('rol_silme')
                        .setDescription('Rol silme olaylarını logla')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Mevcut ModLog ayarlarını gösterir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('ModLog sistemini sıfırlar')),

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
                
                // Kanal izinleri kontrolü
                if (!channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Belirtilen kanalda mesaj gönderme, görüntüleme veya embed gönderme iznim yok.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Olay ayarlarını al
                let messageDelete = options.getBoolean('mesaj_silme') ?? false;
                let messageEdit = options.getBoolean('mesaj_düzenleme') ?? false;
                let channelCreate = options.getBoolean('kanal_oluşturma') ?? false;
                let channelDelete = options.getBoolean('kanal_silme') ?? false;
                let roleCreate = options.getBoolean('rol_oluşturma') ?? false;
                let roleDelete = options.getBoolean('rol_silme') ?? false;
                
                // Hiçbir olay seçilmemişse tümünü varsayılan olarak true yap
                const anyOptionSelected = messageDelete || messageEdit || channelCreate || channelDelete || roleCreate || roleDelete;
                if (!anyOptionSelected) {
                    messageDelete = true;
                    messageEdit = true;
                    channelCreate = true;
                    channelDelete = true;
                    roleCreate = true;
                    roleDelete = true;
                }

                if (useMySQL) {
                    try {
                        // MySQL veritabanını kullan
                        const existing = await client.db.select('modlog', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.update('modlog', 
                                { 
                                    channel_id: channel.id, 
                                    message_delete: messageDelete ? 1 : 0,
                                    message_edit: messageEdit ? 1 : 0,
                                    channel_create: channelCreate ? 1 : 0,
                                    channel_delete: channelDelete ? 1 : 0,
                                    role_create: roleCreate ? 1 : 0,
                                    role_delete: roleDelete ? 1 : 0
                                }, 
                                { guild_id: guildID }
                            );
                        } else {
                            await client.db.insert('modlog', {
                                guild_id: guildID,
                                channel_id: channel.id,
                                message_delete: messageDelete ? 1 : 0,
                                message_edit: messageEdit ? 1 : 0,
                                channel_create: channelCreate ? 1 : 0,
                                channel_delete: channelDelete ? 1 : 0,
                                role_create: roleCreate ? 1 : 0,
                                role_delete: roleDelete ? 1 : 0
                            });
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                    }
                } else {
                    // Yerel veritabanını kullan
                    saveToLocalDB(client.localDB, guildID, channel.id, {
                        message_delete: messageDelete,
                        message_edit: messageEdit,
                        channel_create: channelCreate,
                        channel_delete: channelDelete,
                        role_create: roleCreate, 
                        role_delete: roleDelete
                    });
                }

                // Özel bir mesaj ekle, hiç seçim yapılmadıysa
                const successMessage = !anyOptionSelected 
                    ? `> \`ModLog sistemi başarıyla ayarlandı!\`\n> \`Kanal: ${channel.name}\`\n> \`Tüm log türleri otomatik olarak etkinleştirildi.\``
                    : `> \`ModLog sistemi başarıyla ayarlandı!\`\n> \`Kanal: ${channel.name}\``;
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    successMessage
                );

                return interaction.reply({ embeds: [embed] });
            } else if (subcommand === 'bilgi') {
                // Mevcut ModLog ayarlarını göster
                let channelId, settings = {};
                
                if (useMySQL) {
                    try {
                        const results = await client.db.select('modlog', { guild_id: guildID });
                        if (results && results.length > 0) {
                            channelId = results[0].channel_id;
                            settings = {
                                message_delete: results[0].message_delete === 1,
                                message_edit: results[0].message_edit === 1,
                                channel_create: results[0].channel_create === 1,
                                channel_delete: results[0].channel_delete === 1,
                                role_create: results[0].role_create === 1,
                                role_delete: results[0].role_delete === 1
                            };
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL okuma hatası: ${dbError.message}`));
                    }
                } else {
                    // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
                    channelId = client.localDB.getData("modlog_kanal", `kanal_${guildID}`);
                    
                    if (channelId) {
                        settings.message_delete = client.localDB.getData("modlog_ayarlar", `mesaj_silme_${guildID}`) === true;
                        settings.message_edit = client.localDB.getData("modlog_ayarlar", `mesaj_duzenleme_${guildID}`) === true;
                        settings.channel_create = client.localDB.getData("modlog_ayarlar", `kanal_olusturma_${guildID}`) === true;
                        settings.channel_delete = client.localDB.getData("modlog_ayarlar", `kanal_silme_${guildID}`) === true;
                        settings.role_create = client.localDB.getData("modlog_ayarlar", `rol_olusturma_${guildID}`) === true;
                        settings.role_delete = client.localDB.getData("modlog_ayarlar", `rol_silme_${guildID}`) === true;
                    }
                }
                
                if (!channelId) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Bilgi:`,
                        `> \`Bu sunucu için ModLog ayarlanmamış.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                const channel = guild.channels.cache.get(channelId);
                
                // Etkinleştirilmiş olayları bir diziye ekle
                const enabledLogs = [];
                if (settings.message_delete) enabledLogs.push('Mesaj Silme');
                if (settings.message_edit) enabledLogs.push('Mesaj Düzenleme');
                if (settings.channel_create) enabledLogs.push('Kanal Oluşturma');
                if (settings.channel_delete) enabledLogs.push('Kanal Silme');
                if (settings.role_create) enabledLogs.push('Rol Oluşturma');
                if (settings.role_delete) enabledLogs.push('Rol Silme');
                
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.info} ModLog Bilgileri`,
                    `> \`Kanal: ${channel ? channel.name : 'Bilinmiyor'}\`\n\n` +
                    `**Aktif Loglar:**\n` +
                    `\`\`\`\n${enabledLogs.join('\n')}\n\`\`\``
                );
                
                return interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    try {
                        await client.db.delete('modlog', { guild_id: guildID });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL silme hatası: ${dbError.message}`));
                    }
                } else {
                    client.localDB.deleteData('modlog_kanal', `kanal_${guildID}`);
                    client.localDB.deleteData('modlog_ayarlar', `mesaj_silme_${guildID}`);
                    client.localDB.deleteData('modlog_ayarlar', `mesaj_duzenleme_${guildID}`);
                    client.localDB.deleteData('modlog_ayarlar', `kanal_olusturma_${guildID}`);
                    client.localDB.deleteData('modlog_ayarlar', `kanal_silme_${guildID}`);
                    client.localDB.deleteData('modlog_ayarlar', `rol_olusturma_${guildID}`);
                    client.localDB.deleteData('modlog_ayarlar', `rol_silme_${guildID}`);
                }
                
                // Her durumda yerel veritabanından da sil
              

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`ModLog sistemi başarıyla sıfırlandı!\``
                );

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('ModLog komutu hatası:', error);
            
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

// LocalDB'ye ayarları kaydetme yardımcı fonksiyonu
function saveToLocalDB(localDB, guildID, channelID, settings) {
    localDB.insertData('modlog_kanal', `kanal_${guildID}`, channelID);
    localDB.insertData('modlog_ayarlar', `mesaj_silme_${guildID}`, settings.message_delete);
    localDB.insertData('modlog_ayarlar', `mesaj_duzenleme_${guildID}`, settings.message_edit);
    localDB.insertData('modlog_ayarlar', `kanal_olusturma_${guildID}`, settings.channel_create);
    localDB.insertData('modlog_ayarlar', `kanal_silme_${guildID}`, settings.channel_delete);
    localDB.insertData('modlog_ayarlar', `rol_olusturma_${guildID}`, settings.role_create);
    localDB.insertData('modlog_ayarlar', `rol_silme_${guildID}`, settings.role_delete);
}
