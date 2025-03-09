const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ozel-oda-ayarla')
        .setDescription('Özel oda sistemini ayarlar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Özel oda sistemini ayarlar')
                .addChannelOption(option =>
                    option.setName('kategori')
                        .setDescription('Özel odaların açılacağı kategori')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_kanal')
                        .setDescription('Özel oda loglarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('max_oda')
                        .setDescription('Bir kullanıcının maksimum kaç özel odası olabilir (1-5)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(5))
                .addStringOption(option =>
                    option.setName('renk')
                        .setDescription('Özel oda embed rengi (HEX formatında, örn: #5768ea)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Mevcut özel oda sistemi ayarlarını gösterir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('Özel oda sistemini sıfırlar')),

    async execute(interaction) {
        try {
            const { options, client, guild } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const subcommand = options.getSubcommand();
            const guildID = guild.id;

            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;

            if (subcommand === 'ayarla') {
                const category = options.getChannel('kategori');
                const logChannel = options.getChannel('log_kanal');
                const maxRooms = options.getInteger('max_oda');
                const embedColor = options.getString('renk') || '#5768ea';

                // Renk formatını kontrol et
                const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                if (!colorRegex.test(embedColor)) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Hata:`,
                        `> \`Geçersiz renk formatı! Örnek: #5768ea\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Kanal izin kontrolleri
                if (!logChannel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Hata:`,
                        `> \`Log kanalında mesaj gönderme, görüntüleme veya embed gönderme iznim yok.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Özel oda verilerini kaydet
                const privateRoomSettings = {
                    categoryId: category.id,
                    logChannelId: logChannel.id,
                    maxRoomsPerUser: maxRooms,
                    embedColor: embedColor
                };

                if (useMySQL) {
                    try {
                        const existing = await client.db.select('private_room_settings', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.query(
                                'UPDATE private_room_settings SET category_id = ?, log_channel_id = ?, max_rooms_per_user = ?, embed_color = ? WHERE guild_id = ?', 
                                [category.id, logChannel.id, maxRooms, embedColor, guildID]
                            );
                        } else {
                            await client.db.query(
                                'INSERT INTO private_room_settings (guild_id, category_id, log_channel_id, max_rooms_per_user, embed_color) VALUES (?, ?, ?, ?, ?)', 
                                [guildID, category.id, logChannel.id, maxRooms, embedColor]
                            );
                        }
                        
                        const embed = embedHandler.successEmbed(
                            `> ${emoji.success || '✅'} Başarılı!`,
                            `> \`Özel oda sistemi başarıyla ayarlandı!\`\n\n` +
                            `> **Kategori:** ${category}\n` +
                            `> **Log Kanalı:** ${logChannel}\n` +
                            `> **Kişi Başı Maksimum Oda:** ${maxRooms}`
                        );
                        
                        return interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error(global.hata(`Özel oda ayarlama MySQL hatası: ${error}`));
                        
                        const embed = embedHandler.errorEmbed(
                            `> ${emoji.close || '❌'} Hata:`,
                            `> \`Veritabanı işlemi sırasında bir hata oluştu.\``
                        );
                        
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } else {
                    // LocalDB'ye kaydet
                    await localDBHandler.insertData("private_room_settings", `privateRoom.${guildID}.settings`, privateRoomSettings);
                    
                    const embed = embedHandler.successEmbed(
                        `> ${emoji.success || '✅'} Başarılı!`,
                        `> \`Özel oda sistemi başarıyla ayarlandı!\`\n\n` +
                        `> **Kategori:** ${category}\n` +
                        `> **Log Kanalı:** ${logChannel}\n` +
                        `> **Kişi Başı Maksimum Oda:** ${maxRooms}`
                    );
                    
                    return interaction.reply({ embeds: [embed] });
                }
            }
            else if (subcommand === 'bilgi') {
                // Mevcut ayarları getir
                let settings;
                
                if (useMySQL) {
                    const result = await client.db.select('private_room_settings', { guild_id: guildID });
                    settings = result && result.length > 0 ? result[0] : null;
                } else {
                    settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
                }
                
                if (!settings) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Hata:`,
                        `> \`Bu sunucuda özel oda sistemi ayarlanmamış!\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                // MySQL ve LocalDB için ortak veri yapısı oluştur
                const categoryId = useMySQL ? settings.category_id : settings.categoryId;
                const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
                const maxRooms = useMySQL ? settings.max_rooms_per_user : settings.maxRoomsPerUser;
                const embedColor = settings.embedColor || settings.embed_color;
                
                // Kanalları bul
                const category = guild.channels.cache.get(categoryId);
                const logChannel = guild.channels.cache.get(logChannelId);
                
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.door || '🚪'} Özel Oda Sistemi Ayarları`,
                    `> **Kategori:** ${category ? category.toString() : '`Bulunamadı`'}\n` +
                    `> **Log Kanalı:** ${logChannel ? logChannel.toString() : '`Bulunamadı`'}\n` +
                    `> **Kişi Başı Maksimum Oda:** ${maxRooms}\n` +
                    `> **Embed Rengi:** ${embedColor}`
                );
                
                return interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    await client.db.query('DELETE FROM private_room_settings WHERE guild_id = ?', [guildID]);
                } else {
                    await localDBHandler.delete("private_room_settings", `privateRoom.${guildID}.settings`);
                }
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.success || '✅'} Başarılı!`,
                    `> \`Özel oda sistemi başarıyla sıfırlandı!\``
                );
                
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Özel oda ayarlama hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Bir hata oluştu: ${error.message}\``
            );
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
