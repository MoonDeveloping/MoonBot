const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('Belirtilen sayıda mesajı kanaldan siler')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option => 
            option.setName('miktar')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('kullanıcı')
                .setDescription('Sadece belirli kullanıcının mesajlarını sil')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const { options, client, channel, member } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Parametreleri al
            const amount = options.getInteger('miktar');
            const targetUser = options.getUser('kullanıcı');
            
            // Miktar kontrolü
            if (amount < 1 || amount > 100) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close} Hata:`,
                    `> \`1 ile 100 arasında bir sayı belirtmelisiniz.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Bot'un yetkisini kontrol et
            if (!channel.permissionsFor(interaction.guild.members.me).has('ManageMessages')) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close} Hata:`,
                    `> \`Bu kanalda mesaj silme yetkim yok.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Önce interaction'ı ertele, çünkü silme işlemi biraz zaman alabilir
            await interaction.deferReply({ ephemeral: true });
            
            // Mesajları çek ve filtrele
            const messages = await channel.messages.fetch({ limit: amount + 1 });
            
            let filteredMessages;
            if (targetUser) {
                filteredMessages = messages.filter(msg => msg.author.id === targetUser.id);
                
                // Eğer kullanıcı filtresi belirtildi ama mesaj bulunamadı
                if (filteredMessages.size === 0) {
                    const embed = embedHandler.errorEmbed(
                        `> ${emoji.close} Hata:`,
                        `> \`Belirtilen kullanıcıya ait mesaj bulunamadı.\``
                    );
                    return interaction.editReply({ embeds: [embed] });
                }
                
                // Maksimum mesaj sayısını kontrol et
                filteredMessages = filteredMessages.first(amount);
            } else {
                filteredMessages = messages.first(amount);
            }
            
            // Toplu mesaj silme yöntemi 14 günden eski mesajlarda çalışmaz, bu yüzden kontrol ediyoruz
            const now = Date.now();
            const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
            
            // 14 günden eski olan mesajlar için ayrı silme
            const oldMessages = filteredMessages.filter(msg => msg.createdTimestamp < twoWeeksAgo);
            const newMessages = filteredMessages.filter(msg => msg.createdTimestamp >= twoWeeksAgo);
            
            let deletedCount = 0;
            
            // Yeni mesajları toplu sil
            if (newMessages.length > 0) {
                await channel.bulkDelete(newMessages, true);
                deletedCount += newMessages.length;
            }
            
            // Eski mesajları tek tek sil
            if (oldMessages.length > 0) {
                for (const msg of oldMessages) {
                    await msg.delete();
                    deletedCount++;
                }
            }
            
            // Sonuç bildirimi
            const successMessage = targetUser
                ? `> \`${targetUser.tag} kullanıcısının ${deletedCount} mesajı silindi.\``
                : `> \`${deletedCount} mesaj silindi.\``;
                
            const embed = embedHandler.successEmbed(
                `> ${emoji.done} Başarılı!`,
                successMessage
            );
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Temizle komutu hatası:', error);
            
            // Hata durumunda embedHandler oluştur
            let embedHandler;
            try {
                embedHandler = require('../../util/embedHandler')(interaction.client);
            } catch (embErr) {
                return interaction.editReply({ 
                    content: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                    ephemeral: true 
                });
            }
            
            const errorEmbed = embedHandler.errorEmbed(
                `> ${emoji.close} Hata:`,
                `> \`Mesajlar silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.\``
            );
            
            // Ensure interaction is replied to
            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
