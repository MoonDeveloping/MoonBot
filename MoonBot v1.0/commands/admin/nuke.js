const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ChannelType
} = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('Kanalı sıfırlar (tamamen aynı ayarlarla yeniden oluşturur)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option => 
            option.setName('kanal')
                .setDescription('Nuke edilecek kanal (belirtilmezse mevcut kanal)')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)),
    
    async execute(interaction) {
        try {
            const { options, client, guild, channel: commandChannel } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Hedef kanalı belirle (belirtilmemişse mevcut kanal)
            const targetChannel = options.getChannel('kanal') || commandChannel;
            
            // Hedef kanal sadece metin kanalı olabilir
            if (targetChannel.type !== ChannelType.GuildText) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Sadece metin kanalları nuke edilebilir.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Bot'un yetkisini kontrol et
            if (!targetChannel.permissionsFor(guild.members.me).has(['ManageChannels'])) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Bu kanalı yönetme yetkim yok.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Onay mesajı oluştur
            const confirmEmbed = embedHandler.infoEmbed(
                `> ${emoji.warning || '⚠️'} Onay Bekliyor:`,
                `> \`#${targetChannel.name}\` kanalını nuke etmek istediğinize emin misiniz?\n` +
                `> Bu işlem, kanalın tüm mesajlarını silecek ve kanalı yeniden oluşturacaktır.`
            );
            
            // Onay butonları
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('nuke_confirm')
                        .setLabel('Evet, Kanalı Patlat')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji(emoji.done || '✅'),
                    new ButtonBuilder()
                        .setCustomId('nuke_cancel')
                        .setLabel('İptal')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(emoji.close || '❌')
                );
            
            // Onay mesajını gönder ve fetchReply yerine daha sonra reply'ı al
            await interaction.reply({ 
                embeds: [confirmEmbed], 
                components: [row]
            });
            
            // Yanıtı al
            const message = await interaction.fetchReply();
            
            // Buton etkileşimi için collector oluştur
            const filter = i => i.user.id === interaction.user.id && 
                               (i.customId === 'nuke_confirm' || i.customId === 'nuke_cancel');
            
            const collector = message.createMessageComponentCollector({ 
                filter, 
                time: 30000, // 30 saniye
                max: 1 
            });
            
            collector.on('collect', async i => {
                if (i.customId === 'nuke_cancel') {
                    const cancelEmbed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} İptal Edildi:`,
                        `> \`Nuke işlemi iptal edildi.\``
                    );
                    await i.update({ embeds: [cancelEmbed], components: [] });
                } else {
                    // "Nuke işlemi başlıyor" mesajı
                    const processingEmbed = embedHandler.infoEmbed(
                        `> ${emoji.loading || '⏳'} İşlem Başlatılıyor:`,
                        `> \`#${targetChannel.name}\` kanalı nuke ediliyor...`
                    );
                    await i.update({ embeds: [processingEmbed], components: [] });
                    
                    try {
                        // Kanalın özelliklerini kopyala
                        const channelData = {
                            name: targetChannel.name,
                            parent: targetChannel.parent,
                            topic: targetChannel.topic,
                            nsfw: targetChannel.nsfw,
                            rateLimitPerUser: targetChannel.rateLimitPerUser,
                            position: targetChannel.position
                        };
                        
                        // İzinleri kopyala
                        const permissionOverwrites = targetChannel.permissionOverwrites.cache.map(overwrite => ({
                            id: overwrite.id,
                            allow: overwrite.allow.toArray(),
                            deny: overwrite.deny.toArray(),
                            type: overwrite.type
                        }));
                        
                        // Hedef kanalın mevcut ID'si
                        const oldChannelId = targetChannel.id;
                        
                        // Hedef kanalı sil
                        await targetChannel.delete(`Nuke komutu - ${interaction.user.tag} tarafından`);
                        
                        // Yeni kanal oluştur
                        const newChannel = await guild.channels.create({
                            name: channelData.name,
                            type: ChannelType.GuildText,
                            parent: channelData.parent,
                            topic: channelData.topic,
                            nsfw: channelData.nsfw,
                            rateLimitPerUser: channelData.rateLimitPerUser,
                            position: channelData.position,
                            permissionOverwrites: permissionOverwrites,
                            reason: `Nuke komutu - ${interaction.user.tag} tarafından`
                        });
                        
                        // İşlem başarılı mesajı
                        const successEmbed = embedHandler.successEmbed(
                            `${emoji.boom || '💥'} Kanal Nuke Edildi!`,
                            `Bu kanal <@${interaction.user.id}> tarafından temizlendi.`
                        );
                        
                        // Yeni kanalda başarılı mesajı gönder
                        await newChannel.send({ embeds: [successEmbed] });
                        
                        // Komut kanalı nuke edildiyse, yeni kanalda ek bilgi mesajı gönder
                        if (oldChannelId === commandChannel.id) {
                            const infoEmbed = embedHandler.infoEmbed(
                                `> ${emoji.done || '✅'} Başarılı:`,
                                `> \`#${channelData.name}\` kanalı başarıyla nuke edildi.`
                            );
                            await newChannel.send({ embeds: [infoEmbed] });
                        } else {
                            // Komutu kullanan kişiye bilgi ver
                            const infoEmbed = embedHandler.successEmbed(
                                `> ${emoji.done || '✅'} Başarılı:`,
                                `> \`#${channelData.name}\` kanalı başarıyla nuke edildi.\n` +
                                `> Yeni kanal: <#${newChannel.id}>`
                            );
                            await interaction.followUp({ embeds: [infoEmbed], ephemeral: true });
                        }
                    } catch (error) {
                        console.error(global.hata(`Nuke işlemi hatası: ${error.message}`));
                        // Eğer targetChannel hala mevcutsa (silme işlemi başarısız olduysa)
                        if (guild.channels.cache.has(targetChannel.id)) {
                            const errorEmbed = embedHandler.errorEmbed(
                                `> ${emoji.close || '❌'} Hata:`,
                                `> \`Nuke işlemi sırasında bir hata oluştu: ${error.message}\``
                            );
                            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                        }
                    }
                }
            });
            
            // Collector sona erdiğinde
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    // Hiç etkileşim olmadıysa
                    const timeoutEmbed = embedHandler.errorEmbed(
                        `> ${emoji.close || '❌'} Süre Doldu:`,
                        `> \`Nuke onayı için süre doldu. İşlem iptal edildi.\``
                    );
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                }
            });
        } catch (error) {
            console.error(global.hata(`Nuke komutu hatası: ${error}`));
            
            // Hata durumunda embedHandler oluştur
            let embedHandler;
            try {
                embedHandler = require('../../util/embedHandler')(interaction.client);
            } catch (embErr) {
                // Fallback embed yanıtı
                return interaction.reply({ 
                    content: "Bir hata oluştu. Lütfen daha sonra tekrar deneyin.", 
                    ephemeral: true 
                });
            }
            
            const errorEmbed = embedHandler.errorEmbed(
                `> ${emoji.close || '❌'} Hata:`,
                `> \`Komut çalıştırılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.\``
            );
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
