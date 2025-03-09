const { SlashCommandBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ses')
        .setDescription('Müziğin ses seviyesini ayarlar')
        .addIntegerOption(option => 
            option.setName('seviye')
                .setDescription('Ses seviyesi (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),
                
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
            
            // Yeni ses seviyesi
            const volume = options.getInteger('seviye');
            
            // Ses seviyesini ayarla
            queue.setVolume(volume);
            
            const embed = embedHandler.successEmbed(
                `> ${emoji.sound || '🔊'} Ses Seviyesi Ayarlandı`,
                `> \`Ses seviyesi ${volume}% olarak ayarlandı.\``
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(global.hata(`Ses komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Ses seviyesi ayarlanırken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
