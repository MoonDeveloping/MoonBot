const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otorol')
        .setDescription('Sunucuya Giren Kişilere Otomatik Rol Verir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Otorol sistemini ayarlar')
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Verilecek rol')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Log kanalı')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('mesaj')
                        .setDescription('Hoşgeldin mesajı. {user}, {server}, {role} kullanılabilir')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('renk')
                        .setDescription('Embed rengi (HEX formatında, örn: #00ff00)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('Otorol sistemini sıfırlar')),

    async execute(interaction) {
        try {
            const { options, client } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const subcommand = interaction.options.getSubcommand();
            const guildID = interaction.guild.id;

            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;

            if (subcommand === 'ayarla') {
                const role = interaction.options.getRole('rol');
                const channel = interaction.options.getChannel('kanal');
                const welcomeMessage = interaction.options.getString('mesaj') || 
                    `> ${emoji.human} \`Kullanıcı :\` {user} \n> ${emoji.at} \`Verilen Rol :\` {role}`;
                const embedColor = interaction.options.getString('renk') || '#5768ea';

                const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                if (!colorRegex.test(embedColor)) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Geçersiz renk formatı. HEX formatında olmalıdır. Örn: #00ff00\``
                    );

                    return interaction.reply({ embeds: [embed]});
                }

                if (useMySQL) {
                    try {
                        // MySQL veritabanını kullan
                        const existing = await client.db.select('autoroles', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.update('autoroles', 
                                { 
                                    role_id: role.id, 
                                    channel_id: channel.id, 
                                    welcome_message: welcomeMessage,
                                    embed_color: embedColor
                                }, 
                                { guild_id: guildID }
                            );
                        } else {
                            await client.db.insert('autoroles', {
                                guild_id: guildID,
                                role_id: role.id,
                                channel_id: channel.id,
                                welcome_message: welcomeMessage,
                                embed_color: embedColor
                            });
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                    
                    }
                } else {
                    // Yerel veritabanını kullan
                    localDBHandler.insertData('otorol_rol', `rol_${guildID}`, role.id);       
                    localDBHandler.insertData('otorol_kanal', `kanal_${guildID}`, channel.id);
                    localDBHandler.insertData('otorol_mesaj', `mesaj_${guildID}`, welcomeMessage);
                    localDBHandler.insertData('otorol_mesaj', `renk_${guildID}`, embedColor);
                }

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`Otorol Başarıyla Ayarlandı!\``
                );

                return interaction.reply({ embeds: [embed]});

            } else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    try {
                        await client.db.delete('autoroles', { guild_id: guildID });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL silme hatası: ${dbError.message}`));
                       
                    }
                } else {
                    localDBHandler.deleteData('otorol_rol', `rol_${guildID}`);
                    localDBHandler.deleteData('otorol_kanal', `kanal_${guildID}`);
                    localDBHandler.deleteData('otorol_mesaj', `mesaj_${guildID}`);
                    localDBHandler.deleteData('otorol_mesaj', `renk_${guildID}`);
                }

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`Otorol sistemi başarıyla sıfırlandı!\``
                );

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Otorol komutu hatası:', error);
            
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