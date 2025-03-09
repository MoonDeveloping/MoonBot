const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yavaş-mod')
        .setDescription('Kanal için yavaş mod süresini ayarlar')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addIntegerOption(option => 
            option.setName('süre')
                .setDescription('Saniye cinsinden yavaş mod süresi (0-21600)')
                .setMinValue(0)
                .setMaxValue(21600)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Yavaş modun sebebi (opsiyonel)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const { options, client, channel } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Parametreleri al
            const seconds = options.getInteger('süre');
            const reason = options.getString('sebep') || 'Sebep belirtilmedi.';
            
            // Bot'un yetkisini kontrol et
            if (!channel.permissionsFor(interaction.guild.members.me).has('ManageChannels')) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close} Hata:`,
                    `> \`Bu kanalın ayarlarını değiştirme yetkim yok.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Yavaş mod süresini formatla
            let formattedTime = '';
            if (seconds === 0) {
                formattedTime = 'kapalı';
            } else if (seconds < 60) {
                formattedTime = `${seconds} saniye`;
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60);
                formattedTime = `${minutes} dakika`;
            } else {
                const hours = Math.floor(seconds / 3600);
                formattedTime = `${hours} saat`;
            }

            try {
                // Kanalın yavaş mod süresini ayarla
                await channel.setRateLimitPerUser(seconds, reason);
                
                if (seconds === 0) {
                    const embed = embedHandler.successEmbed(
                        `> ${emoji.done} Başarılı!`,
                        `> \`Bu kanal için yavaş mod kapatıldı.\``
                    );
                    return interaction.reply({ embeds: [embed] });
                } else {
                    const embed = embedHandler.successEmbed(
                        `> ${emoji.done} Başarılı!`,
                        `> \`Bu kanal için yavaş mod süresi ${formattedTime} olarak ayarlandı.\`\n> \`Sebep: ${reason}\``
                    );
                    return interaction.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Yavaş mod ayarlanırken hata:', error);
                
                const errorEmbed = embedHandler.errorEmbed(
                    `> ${emoji.close} Hata:`,
                    `> \`Yavaş mod ayarlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.\``
                );
                
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error('Yavaş mod komutu hatası:', error);
            
            // Hata durumunda embedHandler oluştur
            let embedHandler;
            try {
                embedHandler = require('../../util/embedHandler')(interaction.client);
            } catch (embErr) {
                return interaction.reply({ 
                    content: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                    ephemeral: true 
                });
            }
            
            const errorEmbed = embedHandler.errorEmbed(
                `> ${emoji.close} Hata:`,
                `> \`Komut çalıştırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.\``
            );
            
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
