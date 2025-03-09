const { SlashCommandBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('çalan')
        .setDescription('Şu anda çalan şarkı hakkında bilgi verir'),
                
    async execute(interaction) {
        try {
            const { client, guildId } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Kuyruk var mı kontrol et
            const queue = client.distube.getQueue(guildId);
            if (!queue || !queue.songs || queue.songs.length === 0) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Şu anda çalan bir şarkı yok!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            const song = queue.songs[0];
            const currentTime = queue.currentTime;
            const duration = song.duration;
            
            // İlerleme çubuğu oluşturma
            const barLength = 20; // İlerleme çubuğu uzunluğu
            const filledLength = Math.round((currentTime / duration) * barLength);
            const progressBar = '▬'.repeat(filledLength) + '🔘' + '▬'.repeat(barLength - filledLength);
            
            // Yüzde hesaplama
            const percent = Math.round((currentTime / duration) * 100);
            
            // Embed'i oluştur
            const embed = embedHandler.infoEmbed(
                `${emoji.music || '🎵'} Şu Anda Çalıyor`,
                `**[${song.name}](${song.url})**`
            )
            .addFields(
                { name: `${emoji.clock} Süre`, value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\` (${percent}%)`, inline: true },
                { name: `${emoji.human} Ekleyen`, value: `${song.user}`, inline: true },
                { name: `${emoji.sound} Ses`, value: `\`${queue.volume}%\``, inline: true },
                { name: `${emoji.statistic} İlerleme`, value: progressBar }
            )
            .setThumbnail(song.thumbnail);
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(global.hata(`Çalan komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Çalan şarkı bilgisi alınırken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
