const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-ayarla')
        .setDescription('Ticket sistemini ayarlar')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Ticket sistemini ayarlar')
                .addChannelOption(option =>
                    option.setName('kategori')
                        .setDescription('Ticketların açılacağı kategori')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('yetkili_rol')
                        .setDescription('Ticketları görebilecek yetkili rolü')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_kanal')
                        .setDescription('Ticket loglarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('mesaj')
                        .setDescription('Ticket açılış mesajı')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('renk')
                        .setDescription('Ticket embed rengi (HEX formatında, örn: #5768ea)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Mevcut ticket sistemi ayarlarını gösterir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('Ticket sistemini sıfırlar')),

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
                const staffRole = options.getRole('yetkili_rol');
                const logChannel = options.getChannel('log_kanal');
                const welcomeMessage = options.getString('mesaj') || 
                    `> ${emoji.ticket || '🎫'} **Ticket Destek Sistemi**\n\n> Lütfen sorununuzu detaylı bir şekilde açıklayın.\n> Yetkili ekibimiz en kısa sürede size yardımcı olacaktır.`;
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

                // Ticket verilerini kaydet
                const ticketSettings = {
                    categoryId: category.id,
                    staffRoleId: staffRole.id,
                    logChannelId: logChannel.id,
                    welcomeMessage: welcomeMessage,
                    embedColor: embedColor
                };

                if (useMySQL) {
                    try {
                        const existing = await client.db.select('ticket_settings', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.query(
                                'UPDATE ticket_settings SET category_id = ?, staff_role_id = ?, log_channel_id = ?, welcome_message = ?, embed_color = ? WHERE guild_id = ?', 
                                [category.id, staffRole.id, logChannel.id, welcomeMessage, embedColor, guildID]
                            );
                        } else {
                            await client.db.query(
                                'INSERT INTO ticket_settings (guild_id, category_id, staff_role_id, log_channel_id, welcome_message, embed_color) VALUES (?, ?, ?, ?, ?, ?)', 
                                [guildID, category.id, staffRole.id, logChannel.id, welcomeMessage, embedColor]
                            );
                        }
                        
                        const embed = embedHandler.successEmbed(
                            `> ${emoji.success || '✅'} Başarılı!`,
                            `> \`Ticket sistemi başarıyla ayarlandı!\`\n\n` +
                            `> **Kategori:** ${category}\n` +
                            `> **Yetkili Rolü:** ${staffRole}\n` +
                            `> **Log Kanalı:** ${logChannel}`
                        );
                        
                        return interaction.reply({ embeds: [embed] });
                    } catch (error) {
                        console.error(global.hata(`Ticket ayarlama MySQL hatası: ${error}`));
                        
                        const embed = embedHandler.errorEmbed(
                            `> ${emoji.close || '❌'} Hata:`,
                            `> \`Veritabanı işlemi sırasında bir hata oluştu.\``
                        );
                        
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } else {
                    // LocalDB'ye kaydet
                    await localDBHandler.insertData("ticket_settings", `ticket.${guildID}.settings`, ticketSettings);
                    
                    const embed = embedHandler.successEmbed(
                        `> ${emoji.success || '✅'} Başarılı!`,
                        `> \`Ticket sistemi başarıyla ayarlandı!\`\n\n` +
                        `> **Kategori:** ${category}\n` +
                        `> **Yetkili Rolü:** ${staffRole}\n` +
                        `> **Log Kanalı:** ${logChannel}`
                    );
                    
                    return interaction.reply({ embeds: [embed] });
                }
            }
            else if (subcommand === 'bilgi') {
                // Mevcut ayarları getir
                let settings;
                
                if (useMySQL) {
                    const result = await client.db.select('ticket_settings', { guild_id: guildID });
                    settings = result && result.length > 0 ? result[0] : null;
                } else {
                    settings = await localDBHandler.getData("ticket_settings", `ticket.${guildID}.settings`);
                }
                
                if (!settings) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Hata:`,
                        `> \`Bu sunucuda ticket sistemi ayarlanmamış!\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                // MySQL ve LocalDB için ortak veri yapısı oluştur
                const categoryId = useMySQL ? settings.category_id : settings.categoryId;
                const staffRoleId = useMySQL ? settings.staff_role_id : settings.staffRoleId;
                const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
                const welcomeMessage = settings.welcomeMessage || settings.welcome_message;
                const embedColor = settings.embedColor || settings.embed_color;
                
                // Kanalları ve rolleri bul
                const category = guild.channels.cache.get(categoryId);
                const staffRole = guild.roles.cache.get(staffRoleId);
                const logChannel = guild.channels.cache.get(logChannelId);
                
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.ticket || '🎫'} Ticket Sistemi Ayarları`,
                    `> **Kategori:** ${category ? category.toString() : '`Bulunamadı`'}\n` +
                    `> **Yetkili Rolü:** ${staffRole ? staffRole.toString() : '`Bulunamadı`'}\n` +
                    `> **Log Kanalı:** ${logChannel ? logChannel.toString() : '`Bulunamadı`'}\n\n` +
                    `> **Karşılama Mesajı:**\n${welcomeMessage}\n\n` +
                    `> **Embed Rengi:** ${embedColor}`
                );
                
                return interaction.reply({ embeds: [embed] });
            }
            else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    await client.db.query('DELETE FROM ticket_settings WHERE guild_id = ?', [guildID]);
                } else {
                    await localDBHandler.delete("ticket_settings", `ticket.${guildID}.settings`);
                }
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.success || '✅'} Başarılı!`,
                    `> \`Ticket sistemi başarıyla sıfırlandı!\``
                );
                
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Ticket ayarlama hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Bir hata oluştu: ${error.message}\``
            );
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
