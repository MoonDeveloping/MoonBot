const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayıt')
        .setDescription('Sunucu kayıt sistemini yönetir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Kayıt sistemini ayarlar')
                .addRoleOption(option =>
                    option.setName('yetkili_rol')
                        .setDescription('Kayıt yapabilecek yetkili rolü')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('log_kanal')
                        .setDescription('Kayıt loglarının gönderileceği kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('kayıt_kanal')
                        .setDescription('Kayıtların yapılacağı kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('üye_rol')
                        .setDescription('Kayıt olan üyelere verilecek temel rol')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('erkek_rol')
                        .setDescription('Erkek üyelere verilecek rol (opsiyonel)')
                        .setRequired(false))
                .addRoleOption(option =>
                    option.setName('kız_rol')
                        .setDescription('Kız üyelere verilecek rol (opsiyonel)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Mevcut kayıt sistemi ayarlarını gösterir'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('Kayıt sistemini sıfırlar')),

    async execute(interaction) {
        try {
            const { options, client, guild } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const subcommand = options.getSubcommand();
            const guildID = guild.id;

            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;

            if (subcommand === 'ayarla') {
                const staffRole = options.getRole('yetkili_rol');
                const logChannel = options.getChannel('log_kanal');
                const registerChannel = options.getChannel('kayıt_kanal');
                const memberRole = options.getRole('üye_rol');
                const maleRole = options.getRole('erkek_rol');
                const femaleRole = options.getRole('kız_rol');

                // Kanal ve rol izin kontrolleri
                if (!logChannel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Hata:`,
                        `> \`Log kanalında gerekli izinlere sahip değilim.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                if (!registerChannel.permissionsFor(guild.members.me).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Hata:`,
                        `> \`Kayıt kanalında gerekli izinlere sahip değilim.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }

                // Veritabanına kaydet
                const registerData = {
                    staff_role_id: staffRole.id,
                    log_channel_id: logChannel.id,
                    register_channel_id: registerChannel.id,
                    member_role_id: memberRole.id,
                    male_role_id: maleRole ? maleRole.id : null,
                    female_role_id: femaleRole ? femaleRole.id : null
                };

                if (useMySQL) {
                    try {
                        const existing = await client.db.select('register_settings', { guild_id: guildID });
                        
                        if (existing && existing.length > 0) {
                            await client.db.update('register_settings', registerData, { guild_id: guildID });
                        } else {
                            await client.db.insert('register_settings', {
                                guild_id: guildID,
                                ...registerData
                            });
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                        // MySQL hatası durumunda yerel veritabanına kaydet
                        saveToLocalDB(client.localDB, guildID, registerData);
                    }
                } else {
                    // Yerel veritabanına kaydet
                    saveToLocalDB(client.localDB, guildID, registerData);
                }

                // Başarı mesajı gönder
                const embed = embedHandler.successEmbed(
                    `> ${emoji.done || '✅'} Başarılı!`,
                    `> \`Kayıt sistemi başarıyla ayarlandı!\`\n` +
                    `> \`Yetkili Rol: ${staffRole.name}\`\n` +
                    `> \`Log Kanalı: ${logChannel.name}\`\n` +
                    `> \`Kayıt Kanalı: ${registerChannel.name}\`\n` +
                    `> \`Üye Rolü: ${memberRole.name}\`\n` +
                    (maleRole ? `> \`Erkek Rolü: ${maleRole.name}\`\n` : '') +
                    (femaleRole ? `> \`Kız Rolü: ${femaleRole.name}\`\n` : '')
                );

                // Kayıt kanalına örnek kayıt mesajı gönderme
                const registerEmbed = new EmbedBuilder()
                    .setTitle(`${emoji.human || '👤'} Kayıt Sistemi`)
                    .setDescription(
                        `Sunucumuza hoş geldiniz!\n\n` +
                        `• Normal kayıt - Genel üye kaydı\n` +
                        `• Erkek kayıt - Erkek üye kaydı\n` +
                        `• Kız kayıt - Kız üye kaydı\n\n` +
                        `Kayıt işleminiz bir yetkili tarafından gerçekleştirilecektir.`
                    )
                    .setColor('#5768ea')
                    .setFooter({ text: `${client.user.username} • Kayıt Sistemi`, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                // Kayıt butonlarını oluştur
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('register_normal_example')
                        .setLabel('Normal Üye Kaydı Yap')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(emoji.ok || '✅'),
                    new ButtonBuilder()
                        .setCustomId('register_male_example')
                        .setLabel('Erkek Üye Kaydı Yap')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(emoji.man || '👨'),
                    new ButtonBuilder()
                        .setCustomId('register_female_example')
                        .setLabel('Kız Üye Kaydı Yap')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji(emoji.woman || '👩')
                );

                // Kayıt kanalına örnek mesajı gönder
                try {
                    await registerChannel.send({
                        content: "**Bu bir örnek kayıt mesajıdır.** Gerçek kayıt mesajı yeni üye katıldığında gönderilecektir.",
                        embeds: [registerEmbed],
                        components: [row]
                    });
                } catch (err) {
                    console.error(global.hata(`Örnek kayıt mesajı gönderilirken hata: ${err.message}`));
                }

                return interaction.reply({ embeds: [embed] });

            } else if (subcommand === 'bilgi') {
                // Mevcut kayıt ayarlarını göster
                let registerData = null;
                
                if (useMySQL) {
                    try {
                        const results = await client.db.select('register_settings', { guild_id: guildID });
                        if (results && results.length > 0) {
                            registerData = results[0];
                        }
                    } catch (dbError) {
                        console.error(global.hata(`MySQL okuma hatası: ${dbError.message}`));
                    }
                } else {
                    // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
                    const staffRoleId = client.localDB.getData("register_settings", `staff_role_id_${guildID}`);
                    
                    if (staffRoleId) {
                        registerData = {
                            staff_role_id: staffRoleId,
                            log_channel_id: client.localDB.getData("register_settings", `log_channel_id_${guildID}`),
                            register_channel_id: client.localDB.getData("register_settings", `register_channel_id_${guildID}`),
                            member_role_id: client.localDB.getData("register_settings", `member_role_id_${guildID}`),
                            male_role_id: client.localDB.getData("register_settings", `male_role_id_${guildID}`),
                            female_role_id: client.localDB.getData("register_settings", `female_role_id_${guildID}`)
                        };
                    }
                }
                
                if (!registerData) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Bilgi:`,
                        `> \`Bu sunucu için kayıt sistemi ayarlanmamış.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                // Rol ve kanal nesnelerini al
                const staffRole = guild.roles.cache.get(registerData.staff_role_id);
                const logChannel = guild.channels.cache.get(registerData.log_channel_id);
                const registerChannel = guild.channels.cache.get(registerData.register_channel_id);
                const memberRole = guild.roles.cache.get(registerData.member_role_id);
                const maleRole = registerData.male_role_id ? guild.roles.cache.get(registerData.male_role_id) : null;
                const femaleRole = registerData.female_role_id ? guild.roles.cache.get(registerData.female_role_id) : null;
                
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.info || 'ℹ️'} Kayıt Sistemi Bilgileri`,
                    `> \`Yetkili Rol: ${staffRole ? staffRole.name : 'Bulunamadı'}\`\n` +
                    `> \`Log Kanalı: ${logChannel ? logChannel.name : 'Bulunamadı'}\`\n` +
                    `> \`Kayıt Kanalı: ${registerChannel ? registerChannel.name : 'Bulunamadı'}\`\n` +
                    `> \`Üye Rolü: ${memberRole ? memberRole.name : 'Bulunamadı'}\`\n` +
                    (maleRole ? `> \`Erkek Rolü: ${maleRole.name}\`\n` : `> \`Erkek Rolü: Ayarlanmamış\`\n`) +
                    (femaleRole ? `> \`Kız Rolü: ${femaleRole.name}\`\n` : `> \`Kız Rolü: Ayarlanmamış\`\n`)
                );
                
                return interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'sıfırla') {
                if (useMySQL) {
                    try {
                        await client.db.delete('register_settings', { guild_id: guildID });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL silme hatası: ${dbError.message}`));
                    }
                } else 
                {
                    client.localDB.deleteData('register_settings', `staff_role_id_${guildID}`);
                    client.localDB.deleteData('register_settings', `log_channel_id_${guildID}`);
                    client.localDB.deleteData('register_settings', `register_channel_id_${guildID}`);
                    client.localDB.deleteData('register_settings', `member_role_id_${guildID}`);
                    client.localDB.deleteData('register_settings', `male_role_id_${guildID}`);
                    client.localDB.deleteData('register_settings', `female_role_id_${guildID}`);
                }
                
               

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done || '✅'} Başarılı!`,
                    `> \`Kayıt sistemi başarıyla sıfırlandı!\``
                );

                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Kayıt komutu hatası:', error);
            
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
                `> ${emoji.close || '❌'} Hata:`,
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

// LocalDB'ye kayıt sistemi ayarlarını kaydetme yardımcı fonksiyonu
function saveToLocalDB(localDB, guildID, data) {
    localDB.insertData('register_settings', `staff_role_id_${guildID}`, data.staff_role_id);
    localDB.insertData('register_settings', `log_channel_id_${guildID}`, data.log_channel_id);
    localDB.insertData('register_settings', `register_channel_id_${guildID}`, data.register_channel_id);
    localDB.insertData('register_settings', `member_role_id_${guildID}`, data.member_role_id);
    
    if (data.male_role_id)
        localDB.insertData('register_settings', `male_role_id_${guildID}`, data.male_role_id);
    
    if (data.female_role_id)
        localDB.insertData('register_settings', `female_role_id_${guildID}`, data.female_role_id);
}
