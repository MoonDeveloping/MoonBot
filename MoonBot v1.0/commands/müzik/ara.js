const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ara')
        .setDescription('YouTube\'da şarkı arar')
        .addStringOption(option => 
            option.setName('sorgu')
                .setDescription('Aramak istediğiniz şarkı')
                .setRequired(true)),
                
    async execute(interaction) {
        try {
            const { options, client, member, guild, channel } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Üye ses kanalında mı kontrol et
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Bir ses kanalında olmalısınız!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Bot için izinler kontrol et
            const permissions = voiceChannel.permissionsFor(guild.members.me);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Ses kanalına bağlanma veya konuşma iznim yok!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Arama sorgusunu al
            const query = options.getString('sorgu');
            
            // İşlem yapılıyor mesajı
            await interaction.deferReply();
            
            try {
                // YouTube'da ara
                const results = await client.distube.search(query);
                
                // İlk 10 sonucu al
                const tracks = results.slice(0, 10);
                
                if (!tracks.length) {
                    return interaction.editReply({
                        content: `${emoji.close || '❌'} **${query}** için sonuç bulunamadı!`
                    });
                }
                
                // Seçim menüsü için seçenekler oluştur
                const options = tracks.map((track, i) => ({
                    label: track.name.length > 50 ? `${track.name.substring(0, 47)}...` : track.name,
                    description: `${track.uploader.name} • ${track.formattedDuration}`,
                    value: i.toString()
                }));
                
                // Seçim menüsü oluştur
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`search_${member.id}`)
                        .setPlaceholder('Çalmak için bir şarkı seçin...')
                        .addOptions(options)
                );
                
                const embed = embedHandler.infoEmbed(
                    `${emoji.search || '🔍'} Arama Sonuçları: "${query}"`,
                    `> Aşağıdan çalmak istediğiniz şarkıyı seçin.\n> 30 saniye içinde seçim yapmanız gerekiyor.`
                );
                
                const message = await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
                
                // Seçim bekle
                const filter = i => i.customId === `search_${member.id}` && i.user.id === member.id;
                const collector = message.createMessageComponentCollector({ 
                    filter, 
                    time: 30000, 
                    max: 1 
                });
                
                collector.on('collect', async i => {
                    // Seçilen şarkıyı al
                    const selected = tracks[parseInt(i.values[0])];
                    
                    // Yükleniyor mesajı
                    await i.update({ 
                        content: `${emoji.loading || '⏳'} **${selected.name}** yükleniyor...`,
                        embeds: [], 
                        components: [] 
                    });
                    
                    // Şarkıyı çal
                    await client.distube.play(voiceChannel, selected.url, {
                        member: member,
                        textChannel: channel,
                    });
                });
                
                collector.on('end', async collected => {
                    if (collected.size === 0) {
                        // Süre doldu
                        await interaction.editReply({
                            content: `${emoji.close || '❌'} Süre doldu, seçim iptal edildi.`,
                            embeds: [],
                            components: []
                        });
                    }
                });
                
            } catch (error) {
                console.error(global.hata(`Arama yapılırken hata: ${error.message}`));
                
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Arama yapılırken bir hata oluştu: ${error.message}\``
                );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Ara komutu hatası: ${error}`));
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: `${emoji.close || '❌'} Bir hata oluştu: ${error.message}` 
                });
            } else {
                await interaction.reply({ 
                    content: `${emoji.close || '❌'} Bir hata oluştu: ${error.message}`, 
                    ephemeral: true 
                });
            }
        }
    },
};
