const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kuyruk')
        .setDescription('Şarkı kuyruğunu gösterir')
        .addIntegerOption(option =>
            option.setName('sayfa')
                .setDescription('Görüntülenecek sayfa numarası')
                .setRequired(false)
                .setMinValue(1)),
                
    async execute(interaction) {
        try {
            const { client, guildId, options } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Kuyruk var mı kontrol et
            const queue = client.distube.getQueue(guildId);
            if (!queue || !queue.songs || queue.songs.length === 0) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Şarkı kuyruğu boş!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Sayfa başına gösterilecek şarkı sayısı
            const songsPerPage = 10;
            
            // Toplam sayfa sayısı
            const totalSongs = queue.songs.length;
            const totalPages = Math.ceil((totalSongs - 1) / songsPerPage);
            
            // Kullanıcının istediği sayfa veya varsayılan olarak 1
            let page = options.getInteger('sayfa') || 1;
            
            // Sayfa sınırını kontrol et
            if (page > totalPages) {
                page = totalPages;
            }
            
            // Çalan şarkı
            const currentSong = queue.songs[0];
            
            // Başlık
            let description = `**Şu Anda Çalıyor:**\n` +
                `**[${currentSong.name}](${currentSong.url})** - \`${currentSong.formattedDuration}\` | ${currentSong.user}\n\n`;
            
            // Kuyrukta şarkı yoksa
            if (totalSongs === 1) {
                description += "**Kuyrukta şarkı yok.**";
            } else {
                // Kuyruk başlığı
                description += `**Sıradaki Şarkılar:**\n`;
                
                // Sayfa indeksleri
                const startIndex = (page - 1) * songsPerPage + 1;
                const endIndex = Math.min(startIndex + songsPerPage - 1, totalSongs - 1);
                
                // Şarkıları ekle
                for (let i = startIndex; i <= endIndex; i++) {
                    const song = queue.songs[i];
                    description += `**${i}.** [${song.name}](${song.url}) - \`${song.formattedDuration}\` | ${song.user}\n`;
                }
                
                // Sayfa bilgisi ekle
                description += `\nSayfa ${page}/${totalPages} | ${totalSongs - 1} şarkı | Toplam Süre: \`${queue.formattedDuration}\``;
            }
            
            // Ana embed
            const embed = embedHandler.infoEmbed(
                `${emoji.queue || '📋'} Şarkı Kuyruğu`,
                description
            );
            
            // Şu an çalan şarkının thumbnail'ini ekle
            if (currentSong.thumbnail) {
                embed.setThumbnail(currentSong.thumbnail);
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(global.hata(`Kuyruk komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Kuyruk bilgisi alınırken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
