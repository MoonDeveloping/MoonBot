const { SlashCommandBuilder, InteractionResponse } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('durdur')
        .setDescription('Müzik çalmayı durdurur ve kuyruktan çıkar'),
                
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
            
            // Müziği durdur
            await queue.stop();
            
            const embed = embedHandler.successEmbed(
                `> ${emoji.done || '✅'} Müzik Durduruldu`,
                `> \`Şarkı çalma durduruldu ve kuyruk temizlendi.\``
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(global.hata(`Durdur komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Müzik durdurulurken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], flags: InteractionResponse.Flags.EPHEMERAL });
        }
    },
};
