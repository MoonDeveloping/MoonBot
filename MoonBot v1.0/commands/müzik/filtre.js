const { SlashCommandBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filtre')
        .setDescription('Çalan müziğe filtre uygular')
        .addStringOption(option =>
            option.setName('tür')
                .setDescription('Uygulanacak filtre türü')
                .setRequired(true)
                .addChoices(
                    { name: 'Kapalı (Filtreleri Kapat)', value: 'off' },
                    { name: '3D', value: '3d' },
                    { name: 'Bass Boost', value: 'bassboost' },
                    { name: 'Echo (Yankı)', value: 'echo' },
                    { name: 'Karaoke', value: 'karaoke' },
                    { name: 'Nightcore', value: 'nightcore' },
                    { name: 'Vaporwave', value: 'vaporwave' },
                    { name: 'Flanger', value: 'flanger' },
                    { name: 'Gate', value: 'gate' },
                    { name: 'Haas', value: 'haas' },
                    { name: 'Reverse (Ters)', value: 'reverse' },
                    { name: 'Surround', value: 'surround' },
                    { name: 'Phaser', value: 'phaser' },
                    { name: 'Tremolo', value: 'tremolo' },
                    { name: 'Earwax', value: 'earwax' }
                )),
                
    async execute(interaction) {
        try {
            const { options, client, member, guildId } = interaction;
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
            
            // Kuyruk var mı kontrol et
            const queue = client.distube.getQueue(guildId);
            if (!queue) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Şu anda çalan bir şarkı yok!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const filterType = options.getString('tür');
            
            // İşlem başlıyor bildirimi
            await interaction.deferReply();
            
            try {
                if (filterType === 'off') {
                    // Tüm filtreleri kapat
                    await queue.filters.clear();
                    
                    const embed = embedHandler.successEmbed(
                        `> ${emoji.done || '✅'} Filtreler Kapatıldı`,
                        `> \`Tüm ses filtreleri kapatıldı.\``
                    );
                    
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    // Seçilen filtreyi uygula
                    await queue.filters.add(filterType);
                    
                    // Filtrenin Türkçe adını belirleme
                    const filterNames = {
                        '3d': '3D',
                        'bassboost': 'Bass Boost',
                        'echo': 'Yankı',
                        'karaoke': 'Karaoke',
                        'nightcore': 'Nightcore',
                        'vaporwave': 'Vaporwave',
                        'flanger': 'Flanger',
                        'gate': 'Gate',
                        'haas': 'Haas',
                        'reverse': 'Ters Çalma',
                        'surround': 'Surround',
                        'phaser': 'Phaser',
                        'tremolo': 'Tremolo',
                        'earwax': 'Earwax'
                    };
                    
                    const filterName = filterNames[filterType] || filterType;
                    const embed = embedHandler.successEmbed(
                        `> ${emoji.filter || '🎛️'} Filtre Uygulandı`,
                        `> \`${filterName}\` filtresi müziğe uygulandı.\n` +
                        `> Filtreyi kapatmak için \`/filtre kapalı\` komutunu kullanabilirsiniz.`
                    );
                    
                    await interaction.editReply({ embeds: [embed] });
                }
            } catch (error) {
                console.error(global.hata(`Filtre uygulama hatası: ${error.message}`));
                
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Filtre uygulanırken bir hata oluştu: ${error.message}\``
                );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Filtre komutu hatası: ${error}`));
            
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
