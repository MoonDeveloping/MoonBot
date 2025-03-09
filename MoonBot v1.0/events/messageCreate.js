const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { database_type } = require('../config.json');
const emoji = require('../util/emoji');
const localDBHandler = require('../util/localDBHandler');



module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Botların mesajlarını ve DM'leri yoksay
        if (message.author.bot || !message.guild) return;
        
        try {
            const { client, guild, content } = message;
            
            // Otomatik cevap kontrolü yap
            await checkAndSendAutoResponse(client, message);
            
            await counting_game(client,guild.id,message.channel.id,message);
        } catch (error) {
            console.error(global.hata(`messageCreate olay hatası: ${error.message}`));
        }
    }
};

// Otomatik cevapları kontrol et ve gönder
async function checkAndSendAutoResponse(client, message) {
    try {
        const { guild, content, channel } = message;
        const lowerContent = content.toLowerCase();
        
        // Sunucunun tüm otomatik cevaplarını al
        const responses = await getAutoResponses(client, guild.id);
        
        // Eğer otomatik cevap yoksa çık
        if (!responses || responses.length === 0) {
            return;
        }
        
        // Her tetikleyiciyi kontrol et
        for (const response of responses) {
            if (lowerContent.includes(response.trigger.toLowerCase())) {
                // Embed handler'ı import et
                const embedHandler = require('../util/embedHandler')(client);
                
                // Yanıtı gönder
                if (response.useEmbed) {
                    const embed = new EmbedBuilder()
                        .setDescription(response.response)
                        .setColor(response.embedColor || '#5768ea')
                    
                    await channel.send({ embeds: [embed] });
                } else {
                    await channel.send({ content: response.response });
                }
                
                // İlk eşleşen tetikleyicide dön (birden fazla tepki isteniyorsa bu kısmı değiştirin)
                break;
            }
        }
    } catch (error) {
        console.error(global.hata(`Otomatik cevap hatası: ${error.message}`));
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

async function counting_game(client,guildID,channelID,message){
    const embedHandler = require('../util/embedHandler')(client);
    const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
    if (useMySQL) {
        try {
            const countingRows = await client.db.select('counting_game', { guild_id: guildID });
            if(countingRows.length > 0){  
                const settings = countingRows[0];
                const expectedNumber = settings.current_number + 1;
                const messageContent = message.content.trim();
                const userNumber = parseInt(messageContent);

                if(channelID !== settings.channel_id) return;

            if (!isNaN(userNumber) && messageContent === userNumber.toString()) {
                    if (message.author.id === settings.last_user_id) {
                        try {
                            await message.delete();
                        } catch {
                           
                        }
                        
                        const errorEmbed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata`,
                        `<@${message.author.id}>, üst üste sayı sayamazsın!
                         Başka birinin **${expectedNumber}** sayısını yazmasını beklemelisin.`
                        );
                        
                        const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
                        setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
                        
                        return;
                    }
            }

            if (userNumber === expectedNumber) {
                // Sayıyı ve son sayan kullanıcıyı güncelle
                await client.db.query('UPDATE counting_game SET current_number = ?, last_user_id = ? WHERE guild_id = ?', 
                  [userNumber, message.author.id, guildID]);
              
              // Doğru sayı tepkisi
              await message.react(`${emoji.done}`);   
              }

            if (userNumber % 100 === 0) {
                    const milestoneEmbed = new EmbedBuilder()
                        .setColor('#5768ea')
                        .setTitle(`> ${emoji.confettiblurple} Dönüm Noktası!`)
                        .setDescription(`
                            > ${emoji.done} \`${userNumber}\` sayısına ulaştınız!
                            
                            Tebrikler! Sayı sayma oyununa katkıda bulunan herkese teşekkürler.
                            Bir sonraki dönüm noktası: **${userNumber + 100}**
                        `)
                        .setTimestamp();
                    
                    await message.channel.send({ embeds: [milestoneEmbed] });
            }


            } else {
               return;
            }
        } catch (err) {
            console.error(global.hata(`MySQL sorgu hatası: ${err.message}`));
        }
    } else {
        try {
            if(localDBHandler.getData('counting_game', `kanal_${guildID}`) === null) return;
            if(channelID !== localDBHandler.getData('counting_game', `kanal_${guildID}`)) return;
            const expectedNumber = localDBHandler.getData('counting_game', `numara_${guildID}`) + 1;
            const messageContent = message.content.trim();
            const userNumber = parseInt(messageContent);

            if (!isNaN(userNumber) && messageContent === userNumber.toString()) {
                const lastUserData = localDBHandler.getData('counting_game', `kullanici_${guildID}`);
                const lastUserId = lastUserData;

                if (message.author.id === lastUserId) {
                    try {
                        await message.delete();
                    } catch {
                       
                    }
                    
                    const errorEmbed = embedHandler.errorEmbed(
                    `> ${emoji.close} Hata`,
                    `<@${message.author.id}>, üst üste sayı sayamazsın!
                     Başka birinin **${expectedNumber}** sayısını yazmasını beklemelisin.`
                    );
                    
                    const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
                    setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
                    
                    return;
                }
            }

            if (userNumber === expectedNumber) {
                // Sayıyı ve son sayan kullanıcıyı güncelle
                localDBHandler.insertData('counting_game', `numara_${guildID}`, userNumber);
                localDBHandler.insertData('counting_game', `kullanici_${guildID}`, message.author.id);  
              // Doğru sayı tepkisi
              await message.react(`${emoji.done}`);   
            }

            if (userNumber % 100 === 0) {
                const milestoneEmbed = new EmbedBuilder()
                    .setColor('#5768ea')
                    .setTitle(`> ${emoji.confettiblurple} Dönüm Noktası!`)
                    .setDescription(`
                        > ${emoji.done} \`${userNumber}\` sayısına ulaştınız!
                        
                        Tebrikler! Sayı sayma oyununa katkıda bulunan herkese teşekkürler.
                        Bir sonraki dönüm noktası: **${userNumber + 100}**
                    `)
                    .setTimestamp();
                
                await message.channel.send({ embeds: [milestoneEmbed] });
            }

        } catch (err) {
            console.error(global.hata(`LocalDB okuma hatası: ${err.message}`));
        }
    }
}
