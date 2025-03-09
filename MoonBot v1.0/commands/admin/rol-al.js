const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-al')
        .setDescription('Belirtilen kullanıcıdan rol alır')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => 
            option.setName('kullanıcı')
                .setDescription('Rolü alınacak kullanıcı')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('rol')
                .setDescription('Alınacak rol')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            const { options, client, guild } = interaction;
            const embedHandler = require('../../util/embedHandler')(client);
            
            // Parametreleri al
            const targetUser = options.getUser('kullanıcı');
            const role = options.getRole('rol');
            
            // Botun yetkisini kontrol et
            if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Bu sunucuda rolleri yönetme yetkim yok.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Rolün botun en yüksek rolünden daha yüksek olup olmadığını kontrol et
            if (role.position >= guild.members.me.roles.highest.position) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`${role.name} rolü benim en yüksek rolümden daha yüksek. Alamam.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Komutu kullanan kişinin yetkisini kontrol et
            if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== guild.ownerId) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`${role.name} rolü sizin en yüksek rolünüzden daha yüksek veya aynı seviyede.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Kullanıcıyı al
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Kullanıcı bu sunucuda bulunamadı.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Kullanıcının bu role sahip olup olmadığını kontrol et
            if (!targetMember.roles.cache.has(role.id)) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`${targetUser.tag} kullanıcısı ${role.name} rolüne sahip değil.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Rolü kaldır
            await targetMember.roles.remove(role, `${interaction.user.tag} tarafından kaldırıldı`);
            
            const embed = embedHandler.successEmbed(
                `> ${emoji.done || '✅'} Başarılı!`,
                `> \`${targetUser.tag} kullanıcısından ${role.name} rolü alındı.\``
            );
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Rol-al komutu hatası: ${error}`));
            
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
                `> \`Bir hata oluştu: ${error.message}\``
            );
            
            // Ensure interaction is replied to even if an error occurs
            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            } else {
                return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
