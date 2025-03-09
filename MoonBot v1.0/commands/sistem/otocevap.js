const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otocevap')
        .setDescription('Otomatik cevap sistemini yönetir')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Yeni bir otomatik cevap ekler')
                .addStringOption(option =>
                    option.setName('tetikleyici')
                        .setDescription('Botun tepki vereceği kelime veya cümle')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('yanıt')
                        .setDescription('Botun vereceği cevap')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('embed')
                        .setDescription('Yanıtın embed olarak gönderilip gönderilmeyeceği')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('renk')
                        .setDescription('Embed rengi (HEX formatında, örn: #5768ea)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sil')
                .setDescription('Bir otomatik cevabı siler')
                .addStringOption(option =>
                    option.setName('tetikleyici')
                        .setDescription('Silinecek otomatik cevabın tetikleyicisi')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Sunucudaki tüm otomatik cevapları listeler'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bilgi')
                .setDescription('Belirli bir otomatik cevap hakkında bilgi verir')
                .addStringOption(option =>
                    option.setName('tetikleyici')
                        .setDescription('Bilgi alınacak otomatik cevabın tetikleyicisi')
                        .setRequired(true)
                        .setAutocomplete(true))),

    async autocomplete(interaction) {
        const { options, client, guild } = interaction;
        const focusedValue = options.getFocused().toLowerCase();
        
        try {
            // Sunucudaki otomatik cevap tetikleyicilerini al
            const triggers = await getAutoResponseTriggers(client, guild.id);
            
            // Filtreleme yap
            const filtered = triggers.filter(trigger => 
                trigger.toLowerCase().includes(focusedValue)
            ).slice(0, 25);
            
            await interaction.respond(
                filtered.map(trigger => ({ name: trigger, value: trigger }))
            );
        } catch (error) {
            console.error(global.hata(`Otocevap autocomplete hatası: ${error.message}`));
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        try {
            const { options, client, guild } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            const subcommand = options.getSubcommand();
            const guildID = guild.id;
            
            // Veritabanı kullanılabilirliğini kontrol et
            const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
            
            if (subcommand === 'ekle') {
                const trigger = options.getString('tetikleyici');
                const response = options.getString('yanıt');
                const useEmbed = options.getBoolean('embed') || false;
                let embedColor = options.getString('renk') || '#5768ea';
                
                // Renk formatı kontrolü
                if (useEmbed) {
                    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
                    if (!colorRegex.test(embedColor)) {
                        const embed = embedHandler.errorEmbed(
                            `> ${emoji.close} Hata:`,
                            `> \`Geçersiz renk formatı. HEX formatında olmalıdır. Örn: #5768ea\``
                        );
                        return interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                }
                
                // Eğer tetikleyici zaten varsa kontrol et
                const exists = await checkTriggerExists(client, guildID, trigger);
                if (exists) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`'${trigger}' tetikleyicisi zaten kullanımda! Önce mevcut olanı silin veya farklı bir tetikleyici seçin.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                if (useMySQL) {
                    try {
                        await client.db.insert('auto_responses', {
                            guild_id: guildID,
                            trigger_text: trigger,
                            response_text: response,
                            use_embed: useEmbed ? 1 : 0,
                            embed_color: embedColor
                        });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                        // MySQL hatası durumunda yerel veritabanına kaydet
                    }
                } else {
                    // Yerel veritabanına kaydet
                    saveToLocalDB(client.localDB, guildID, trigger, response, useEmbed, embedColor);
                }
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`'${trigger}' tetikleyicili otomatik cevap eklendi.\`` +
                    `${useEmbed ? '\n> \`Yanıt embed olarak gönderilecek.\`' : ''}`
                );
                
                return interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'sil') {
                const trigger = options.getString('tetikleyici');
                
                // Tetikleyicinin var olup olmadığını kontrol et
                const exists = await checkTriggerExists(client, guildID, trigger);
                if (!exists) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`'${trigger}' tetikleyicili bir otomatik cevap bulunamadı.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                if (useMySQL) {
                    try {
                        await client.db.delete('auto_responses', { 
                            guild_id: guildID,
                            trigger_text: trigger
                        });
                    } catch (dbError) {
                        console.error(global.hata(`MySQL silme hatası: ${dbError.message}`));
                    }
                } else {
                    deleteFromLocalDB(client.localDB, guildID, trigger);
                }
                
                // Her durumda yerel veritabanından da sil
                
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `> \`'${trigger}' tetikleyicili otomatik cevap silindi.\``
                );
                
                return interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'liste') {
                // Sunucunun tüm otomatik cevaplarını al
                const responses = await getAutoResponses(client, guildID);
                
                if (responses.length === 0) {
                    const embed = embedHandler.infoEmbed(
                        `> ${emoji.info} Bilgi:`,
                        `> \`Bu sunucuda hiç otomatik cevap tanımlanmamış.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                // Tepkileri al ve listele
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.info} Otomatik Cevaplar`,
                    `> \`Bu sunucuda ${responses.length} adet otomatik cevap bulunuyor.\``
                );
                
                // Her tetikleyiciyi ekle (maksimum 25 adet göster)
                const maxToShow = Math.min(responses.length, 25);
                for (let i = 0; i < maxToShow; i++) {
                    embed.addFields({
                        name: `${i+1}. ${responses[i].trigger}`,
                        value: `${responses[i].useEmbed ? '📝 Embed' : '💬 Normal'}`
                    });
                }
                
                if (responses.length > maxToShow) {
                    embed.addFields({
                        name: `... ve ${responses.length - maxToShow} daha`,
                        value: `Tüm listeyi görmek için daha spesifik bir komut eklenecek.`
                    });
                }
                
                return interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'bilgi') {
                const trigger = options.getString('tetikleyici');
                
                // Belirtilen tetikleyicinin detaylarını al
                const response = await getAutoResponseDetail(client, guildID, trigger);
                
                if (!response) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`'${trigger}' tetikleyicili bir otomatik cevap bulunamadı.\``
                    );
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                
                const embed = embedHandler.infoEmbed(
                    `> ${emoji.info} Otomatik Cevap Detayı`,
                    `> \`Tetikleyici: ${response.trigger}\``
                )
                .addFields(
                    { name: 'Yanıt', value: response.response.length > 1024 ? 
                        response.response.substring(0, 1021) + '...' : response.response },
                    { name: 'Yanıt Tipi', value: response.useEmbed ? 'Embed' : 'Normal Mesaj', inline: true }
                );
                
                if (response.useEmbed) {
                    embed.addFields({ name: 'Embed Rengi', value: response.embedColor, inline: true });
                }
                
                return interaction.reply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error(global.hata(`Otocevap komutu hatası: ${error.message}`));
            
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

// LocalDB'ye otomatik cevap kaydetme
function saveToLocalDB(localDB, guildID, trigger, response, useEmbed, embedColor) {
    const key = `${guildID}_${trigger.toLowerCase()}`;
    const data = {
        trigger: trigger,
        response: response,
        useEmbed: useEmbed,
        embedColor: embedColor
    };
    localDB.insertData('otocevap', key, data);
}

// LocalDB'den otomatik cevap silme
function deleteFromLocalDB(localDB, guildID, trigger) {
    const key = `${guildID}_${trigger.toLowerCase()}`;
    localDB.deleteData('otocevap', key);
}

// Tetikleyicinin var olup olmadığını kontrol et
async function checkTriggerExists(client, guildID, trigger) {
    const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
    
    if (useMySQL) {
        try {
            const results = await client.db.select('auto_responses', { 
                guild_id: guildID,
                trigger_text: trigger
            });
            return results && results.length > 0;
        } catch (err) {
            console.error(global.hata(`MySQL sorgu hatası: ${err.message}`));
        }
    } else {
        const key = `${guildID}_${trigger.toLowerCase()}`;
        const data = client.localDB.getData("otocevap", key);
        return data !== null;
    }   
}

// Sunucunun tüm otomatik cevaplarını al
async function getAutoResponses(client, guildID) {
    const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
    let responses = [];
    
    if (useMySQL) {
        try {
            const results = await client.db.select('auto_responses', { guild_id: guildID });
            if (results && results.length > 0) {
                responses = results.map(row => ({
                    trigger: row.trigger_text,
                    response: row.response_text,
                    useEmbed: row.use_embed === 1,
                    embedColor: row.embed_color
                }));
            }
        } catch (err) {
            console.error(global.hata(`MySQL sorgu hatası: ${err.message}`));
        }
    } else {
        try {
            const dbFilePath = client.localDB.getDBFilePath('otocevap');
            if (fs.existsSync(dbFilePath)) {
                const fileContent = fs.readFileSync(dbFilePath, "utf-8");
                if (fileContent) {
                    const dbData = JSON.parse(fileContent);
                    
                    // Sunucuya ait kayıtları filtrele
                    const prefix = `${guildID}_`;
                    responses = Object.keys(dbData)
                        .filter(key => key.startsWith(prefix))
                        .map(key => dbData[key]);
                }
            }
        } catch (err) {
            console.error(global.hata(`LocalDB okuma hatası: ${err.message}`));
        }
    }
    return responses;
}

// Otomatik cevap tetikleyicilerini al
async function getAutoResponseTriggers(client, guildID) {
    const responses = await getAutoResponses(client, guildID);
    return responses.map(response => response.trigger);
}

// Belirli bir tetikleyicinin detaylarını al
async function getAutoResponseDetail(client, guildID, trigger) {
    const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
    
    if (useMySQL) {
        try {
            const results = await client.db.select('auto_responses', { 
                guild_id: guildID,
                trigger_text: trigger
            });
            
            if (results && results.length > 0) {
                return {
                    trigger: results[0].trigger_text,
                    response: results[0].response_text,
                    useEmbed: results[0].use_embed === 1,
                    embedColor: results[0].embed_color
                };
            }
        } catch (err) {
            console.error(global.hata(`MySQL sorgu hatası: ${err.message}`));
        }
    } else {
        const key = `${guildID}_${trigger.toLowerCase()}`;
        const data = client.localDB.getData("otocevap", key);
        return data;
    }
    

}
