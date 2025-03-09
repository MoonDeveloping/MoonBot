const { SlashCommandBuilder } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('döngü')
        .setDescription('Döngü modunu değiştirir')
        .addStringOption(option =>
            option.setName('mod')
                .setDescription('Döngü modu')
                .setRequired(true)
                .addChoices(
                    { name: 'Kapalı', value: 'off' },
                    { name: 'Şarkı', value: 'song' },
                    { name: 'Kuyruk', value: 'queue' }
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
            
            const loopMode = options.getString('mod');
            let modeName, modeEmoji;
            
            // Döngü modunu ayarla
            switch (loopMode) {
                case 'off':
                    queue.setRepeatMode(0);
                    modeName = 'Kapalı';
                    modeEmoji = emoji.close || '❌';
                    break;
                case 'song':
                    queue.setRepeatMode(1);
                    modeName = 'Şarkı';
                    modeEmoji = emoji.repeat || '🔂';
                    break;
                case 'queue':
                    queue.setRepeatMode(2);
                    modeName = 'Kuyruk';
                    modeEmoji = emoji.repeatall || '🔁';
                    break;
            }
            
            const embed = embedHandler.successEmbed(
                `> ${modeEmoji} Döngü Modu Değiştirildi`,
                `> \`Döngü modu '${modeName}' olarak ayarlandı.\``
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(global.hata(`Döngü komutu hatası: ${error}`));
            
            const embedHandler = require('../../util/embedHandler')(interaction.client);
            const embed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Döngü modu değiştirilirken bir hata oluştu: ${error.message}\``
            );
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
