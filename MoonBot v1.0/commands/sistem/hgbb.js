const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hgbb')
        .setDescription('Hoşgeldin ve Güle Güle mesajları sistemini yönetir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('HG/BB sistemini ayarlar')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Mesajların gönderileceği kanal')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('hosgeldin_mesaj')
                        .setDescription('Hoşgeldin mesajı. {user}, {server}, {memberCount} kullanılabilir')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('gule_gule_mesaj')
                        .setDescription('Güle güle mesajı. {user}, {server}, {memberCount} kullanılabilir')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('hosgeldin_renk')
                        .setDescription('Hoşgeldin embed rengi (HEX formatında, örn: #00ff00)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('gule_gule_renk')
                        .setDescription('Güle güle embed rengi (HEX formatında, örn: #ff0000)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('HG/BB sistemini sıfırlar')),

    async execute(interaction) {
        try {
            const { options, client } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const subcommand = options.getSubcommand();
            const guildID = interaction.guild.id;

            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;

            if (subcommand === 'ayarla') {
                const channel = options.getChannel('kanal');
                const welcomeMessage = options.getString('hosgeldin_mesaj') || 
                    `> ${emoji.human} **{user}** sunucumuza hoş geldin!\n> Seninle birlikte **{memberCount}** kişiye ulaştık.`;
                const leaveMessage = options.getString('gule_gule_mesaj') || 
                    `> ${emoji.human} **{user}** sunucumuzdan ayrıldı.\n> Artık **{memberCount}** kişiyiz.`;
                const welcomeColor = options.getString('hosgeldin_renk') || '#5768ea';
                const leaveColor = options.getString('gule_gule_renk') || '#c65b62';

                // Renk formatı kontrolü
                const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                if (!colorRegex.test(welcomeColor) || !colorRegex.test(leaveColor)) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Geçersiz renk formatı. HEX formatında olmalıdır. Örn: #00ff00\``
                    );
                    return interaction.reply({ embeds: [embed] });
                }

                // Kanal izinleri kontrolü
                if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Belirtilen kanalda mesaj gönderme, görüntüleme veya embed gönderme iznim yok.\``
                    );
                    return interaction.reply({ embeds: [embed] });
                }

                if (useMySQL) {
                    try {
                        // MySQL veritabanını kullan
                        const existing = await client.db.select('welcome_leave', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.update('welcome_leave', 
                                { 
                                    channel_id: channel.id, 
                                    welcome_message: welcomeMessage,
                                    leave_message: leaveMessage,
                                    welcome_color: welcomeColor,
                                    leave_color: leaveColor
                                }, 
                                { guild_id: guildID }
                            );
                        } else {
                            await client.db.insert('welcome_leave', {
                                guild_id: guildID,
                                channel_id: channel.id,
                                welcome_message: welcomeMessage,
                                leave_message: leaveMessage,
                                welcome_color: welcomeColor,
                                leave_color: leaveColor
                            });
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                    }
                } else {
                    // Yerel veritabanını kullan
                    localDBHandler.insertData('hgbb_kanal', `kanal_${guildID}`, channel.id);
                    localDBHandler.insertData('hgbb_mesaj', `hosgeldin_${guildID}`, welcomeMessage);
                    localDBHandler.insertData('hgbb_mesaj', `gulegule_${guildID}`, leaveMessage);
                    localDBHandler.insertData('hgbb_mesaj', `hosgeldin_renk_${guildID}`, welcomeColor);
                    localDBHandler.insertData('hgbb_mesaj', `gulegule_renk_${guildID}`, leaveColor);
                }

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`Hoşgeldin/Güle Güle sistemi başarıyla ayarlandı!\``
                );

                return interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    try {
                        await client.db.delete('welcome_leave', { guild_id: guildID });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL silme hatası: ${dbError.message}`));
                    }
                } else {
                    localDBHandler.deleteData('hgbb_kanal', `kanal_${guildID}`);
                    localDBHandler.deleteData('hgbb_mesaj', `hosgeldin_${guildID}`);
                    localDBHandler.deleteData('hgbb_mesaj', `gulegule_${guildID}`);
                    localDBHandler.deleteData('hgbb_mesaj', `hosgeldin_renk_${guildID}`);
                    localDBHandler.deleteData('hgbb_mesaj', `gulegule_renk_${guildID}`);
                }
                
                // Yerel veritabanından da sil
               

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`Hoşgeldin/Güle Güle sistemi başarıyla sıfırlandı!\``
                );

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('HGBB komutu hatası:', error);
            
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