const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-ver')
        .setDescription('Belirtilen kullanıcıya rol verir')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option => 
            option.setName('kullanıcı')
                .setDescription('Rol verilecek kullanıcı')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('rol')
                .setDescription('Verilecek rol')
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
                    `> \`${role.name} rolü benim en yüksek rolümden daha yüksek. Veremem.\``
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
            
            // Kullanıcının zaten bu role sahip olup olmadığını kontrol et
            if (targetMember.roles.cache.has(role.id)) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`${targetUser.tag} kullanıcısı zaten ${role.name} rolüne sahip.\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Role ekle
            await targetMember.roles.add(role, `${interaction.user.tag} tarafından eklendi`);
            
            const embed = embedHandler.successEmbed(
                `> ${emoji.done || '✅'} Başarılı!`,
                `> \`${targetUser.tag} kullanıcısına ${role.name} rolü verildi.\``
            );
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error(global.hata(`Rol-ver komutu hatası: ${error}`));
            
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
