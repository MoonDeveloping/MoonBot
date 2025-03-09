const { SlashCommandBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aktif-filtreler')
        .setDescription('Şu anda aktif olan ses filtrelerini gösterir'),
                
    async execute(interaction) {
        try {
            const { client, guildId } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Kuyruk var mı kontrol et
            const queue = client.distube.getQueue(guildId);
            if (!queue) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Şu anda çalan bir şarkı yok!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Aktif filtreleri al
            const activeFilters = queue.filters.names;
            
            // Filtrelerin Türkçe karşılıklarını tanımla
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
            
            // Filtreleri Türkçe isimleriyle hazırla
            const formattedFilters = activeFilters.map(filter => filterNames[filter] || filter);
            
            if (activeFilters.length === 0) {
                const embed = embedHandler.infoEmbed(
                    `${emoji.filter || '🎛️'} Aktif Filtreler`,
                    `> \`Şu anda aktif filtre bulunmuyor.\`\n` +
                    `> Filtre eklemek için \`/filtre\` komutunu kullanabilirsiniz.`
                );
                
                return interaction.reply({ embeds: [embed] });
            } else {
                const embed = embedHandler.infoEmbed(
                    `${emoji.filter || '🎛️'} Aktif Filtreler`,
                    `> **Şu anda aktif olan filtreler:**\n` +
                    `> \`${formattedFilters.join('`, `')}\`\n\n` +
                    `> Filtreleri kapatmak için \`/filtre kapalı\` komutunu kullanabilirsiniz.`
                );
                
                return interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Aktif filtreler komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Aktif filtreler alınırken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
