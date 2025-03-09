const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Ticket oluşturma paneli oluşturur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Panel mesajının gönderileceği kanal')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('başlık')
                .setDescription('Panel mesajının başlığı')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('açıklama')
                .setDescription('Panel mesajının açıklaması')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const { options, client, guild } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const guildID = guild.id;
            
            // Parametreleri al
            const channel = options.getChannel('kanal');
            const title = options.getString('başlık') || '🎫 Destek Talebi Oluştur';
            const description = options.getString('açıklama') || 
                '> Destek talebi oluşturmak için aşağıdaki butona tıklayın.\n> Talebiniz en kısa sürede ilgili ekip tarafından yanıtlanacaktır.';
            
            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
            
            // Ticket ayarlarını kontrol et
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
                    `> \`Bu sunucuda ticket sistemi ayarlanmamış!\`\n> \`/ticket-ayarla ayarla\` komutunu kullanarak önce sistemi ayarlayın.`
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Kanal izin kontrolü
            if (!channel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Belirtilen kanalda mesaj gönderme, görüntüleme veya embed gönderme iznim yok.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Embed rengi
            const embedColor = useMySQL ? settings.embed_color : settings.embedColor;
            
            // Panel embed'i oluştur
            const panelEmbed = {
                title: title,
                description: description,
                color: embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea,
                footer: {
                    text: `${guild.name} • Ticket Sistemi`,
                    icon_url: guild.iconURL({ dynamic: true })
                },
                timestamp: new Date()
            };
            
            // Buton oluştur
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('Ticket Oluştur')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(emoji.ticket || '🎫')
                );
                
            // Mesajı gönder
            const message = await channel.send({ embeds: [panelEmbed], components: [row] });
            
            // Panel mesajının ID'sini kaydet
            if (useMySQL) {
                await client.db.query(
                    'UPDATE ticket_settings SET panel_message_id = ?, panel_channel_id = ? WHERE guild_id = ?',
                    [message.id, channel.id, guildID]
                );
            } else {
                await localDBHandler.insertData("ticket_settings", `ticket.${guildID}.settings.panelMessageId`, message.id);
                await localDBHandler.insertData("ticket_settings", `ticket.${guildID}.settings.panelChannelId`, channel.id);
            }
            
            const embed = embedHandler.successEmbed(
                `> ${emoji.success || '✅'} Başarılı!`,
                `> \`Ticket paneli başarıyla oluşturuldu!\`\n> ${channel} kanalına gönderildi.`
            );
            
            return interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Ticket panel hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Bir hata oluştu: ${error.message}\``
            );
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
