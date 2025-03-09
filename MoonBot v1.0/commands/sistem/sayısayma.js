const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const emoji = require('../../util/emoji');
const { database_type } = require('../../config.json');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sayısayma')
        .setDescription('Sayı sayma oyununun oynanacağı kanalı ayarlar')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ayarla')
                .setDescription('Sayı sayma oyununu ayarlar')
                .addChannelOption(option =>
                    option.setName('kanal')
                        .setDescription('Log kanalı')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('sıfırla')
                .setDescription('Sayı sayma oyununu sıfırlar')),

    async execute(interaction) {
        const { options, client } = interaction;
        const embedHandler = require('../../util/embedHandler')(client);
        const guildID = interaction.guild.id;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        const subcommand = interaction.options.getSubcommand();


        if(subcommand=="ayarla"){
            const channel = interaction.options.getChannel('kanal');

             if (useMySQL) {
                try {
                    const existing = await client.db.select('counting_game', { guild_id: guildID });
                    
                    if (existing && existing.length > 0) {
                        await client.db.query('UPDATE counting_game SET channel_id = ?, current_number = 0, last_user_id = NULL WHERE guild_id = ?', 
                            [channel.id, guildID]);
                    } else {
                        await client.db.query('INSERT INTO counting_game (guild_id, channel_id, current_number, last_user_id) VALUES (?, ?, 0, NULL)', 
                    [guildID, channel.id]);
                    }
                } catch (dbError) {
                    console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));
                
                }
            } else {
                localDBHandler.insertData('counting_game', `kanal_${guildID}`, channel.id);
                localDBHandler.insertData('counting_game', `numara_${guildID}`, 0);
                localDBHandler.insertData('counting_game', `kullanici_${guildID}`, '0'); 
            }

                const embed = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `
                    > ${emoji.channel} \`Kanal:\` ${channel}
                    > ${emoji.pencil} \`Başlangıç Sayısı:\` **0** (Oyun 1'den başlayacak)
                    
                    **Kurallar:**
                    - Oyuncular sırayla 1'den başlayarak sayı saymalıdır.
                    - Aynı kişi üst üste sayı sayamaz.
                    `
                );

                 interaction.reply({ embeds: [embed]});

                 // Kanala bilgilendirme mesajı gönder
                 const embed2 = embedHandler.successEmbed(
                    `> ${emoji.done} Başarılı!`,
                    `
                    Bu kanal sayı sayma oyunu için ayarlandı!
                    
                    **Kurallar:**
                    > ${emoji.done} \`Sıra ile sayı sayın:\` 1, 2, 3...
                    > ${emoji.done} \`Aynı kişi üst üste sayamaz\`

                    **Oyun 1 sayısı ile başlar.**
                    İyi eğlenceler!
                `
                );

                await channel.send({ embeds: [embed2] });


        } else if (subcommand=="sıfırla"){
            if (useMySQL) {
                try {
                    await client.db.delete('counting_game', { guild_id: guildID });                   
                } catch (dbError) {
                    console.error(global.hata(`MySQL kayıt hatası: ${dbError.message}`));        
                }
            } else {
                localDBHandler.deleteData('counting_game', `kanal_${guildID}`);
                localDBHandler.deleteData('counting_game', `numara_${guildID}`);
                localDBHandler.deleteData('counting_game', `kullanici_${guildID}`); 
            }

            const embed = embedHandler.successEmbed(
                `> ${emoji.done} Başarılı!`,
                `> \`Sayı sayma oyunu başarıyla sıfırlandı!\``
            );

            return interaction.reply({ embeds: [embed]});
        }
    }
}; 