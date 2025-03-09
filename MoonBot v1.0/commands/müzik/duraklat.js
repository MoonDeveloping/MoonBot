const { SlashCommandBuilder, InteractionResponse } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duraklat')
        .setDescription('Çalan müziği duraklatır veya devam ettirir'),
                
    async execute(interaction) {
        try {
            const { client, member, guildId } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Üye ses kanalında mı kontrol et
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Bir ses kanalında olmalısınız!\``
                );
                return interaction.reply({ embeds: [embed], flags: InteractionResponse.Flags.EPHEMERAL });
            }
            
            // Kuyruk var mı kontrol et
            const queue = client.distube.getQueue(guildId);
            if (!queue) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Şu anda çalan bir şarkı yok!\``
                );
                return interaction.reply({ embeds: [embed], flags: InteractionResponse.Flags.EPHEMERAL });
            }
            
            // Duraklatma/Devam ettirme durumunu değiştir
            const isPaused = queue.paused;
            
            if (isPaused) {
                queue.resume();
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.play || '▶️'} Müzik Devam Ediyor`,
                    `> \`Müzik çalmaya devam ediyor.\``
                );
                
                await interaction.reply({ embeds: [embed] });
            } else {
                queue.pause();
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.pause || '⏸️'} Müzik Duraklatıldı`,
                    `> \`Müzik duraklatıldı. Devam ettirmek için tekrar aynı komutu kullanın.\``
                );
                
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Duraklat komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Müzik duraklatılırken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
