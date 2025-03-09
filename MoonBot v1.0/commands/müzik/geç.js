const { SlashCommandBuilder, InteractionResponse } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('geç')
        .setDescription('Çalan şarkıyı geçer ve sıradaki şarkıya geçer'),
                
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
            
            try {
                // Şarkıyı geç
                await queue.skip();
                
                const embed = embedHandler.successEmbed(
                    `> ${emoji.done || '✅'} Şarkı Geçildi`,
                    `> \`Şarkı başarıyla geçildi. Bir sonraki şarkı çalınıyor...\``
                );
                
                await interaction.reply({ embeds: [embed] });
            } catch (e) {
                // Sıradaki şarkı yoksa
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Sırada başka şarkı yok!\``
                );
                await interaction.reply({ embeds: [embed], flags: InteractionResponse.Flags.EPHEMERAL });
            }
        } catch (error) {
            console.error(global.hata(`Geç komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Şarkı geçilirken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], flags: InteractionResponse.Flags.EPHEMERAL });
        }
    },
};
