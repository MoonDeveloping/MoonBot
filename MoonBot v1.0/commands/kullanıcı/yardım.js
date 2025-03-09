const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const chalk = require('chalk');
const localDBHandler = require('../../util/localDBHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardım')
        .setDescription('Mevcut tüm komutları gösterir')
        .addStringOption(option => 
            option.setName('kategori')
                .setDescription('Görüntülenecek komut kategorisi')
                .setRequired(false)),
    async execute(interaction) {
        const { options, client } = interaction;
        const category = options.getString('kategori');
        
        // Embed handler'ı import et
        const embedHandler = require('../../util/embedHandler')(client);
        const emoji = require('../../util/emoji');
        
        const foldersPath = path.join(__dirname, '..');
        const commandFolders = fs.readdirSync(foldersPath);
        
        if (category) {
            if (!commandFolders.includes(category)) {
                return interaction.reply({
                    content: `**⚠️ Geçersiz kategori!**\n> Mevcut kategoriler: \`${commandFolders.join('`, `')}\``,
                    ephemeral: true
                });
            }
            
            const categoryPath = path.join(foldersPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            // Kategori komutları embed'ini oluştur
            const embed = embedHandler.infoEmbed(
                `**${category.toUpperCase()} KATEGORİSİ KOMUTLARI**`,
                `> Bu kategoride toplam **${commandFiles.length}** komut bulunuyor.\n` + 
                `> Aşağıda her komutun açıklamasını görebilirsiniz.\n\n` +
                `\`\`\`md\n# ${category.charAt(0).toUpperCase() + category.slice(1)} Komutları\`\`\``
            ).setFooter({ 
                text: `${client.user.username} • Komut Sistemi • /yardım komutunu kullanarak ana menüye dönebilirsiniz`, 
                iconURL: client.user.displayAvatarURL() 
            });
            
            // Her komutu gösterişli şekilde ekle
            let commandListText = "";
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                const command = require(filePath);
                
                commandListText += `**/${command.data.name}**\n`;
                commandListText += `> \`${command.data.description}\`\n\n`;
            }
            
            embed.setDescription(embed.data.description + commandListText);
            
            // Ana menüye dönmek için buton oluştur
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('help_main_menu')
                        .setLabel('Ana Menüye Dön')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏠')
                );
            
            return interaction.reply({ embeds: [embed], components: [row] });
        }
        
        // Ana menü embed'i
        const embed = embedHandler.infoEmbed(
            `🔍 **KOMUT YARDIM MENÜSÜ**`,
            `**Hoş geldiniz, ${interaction.user.username}!**\n` +
            `> Bot komutlarını kategoriler halinde görüntüleyebilirsiniz.\n` +
            `> Bir kategoriyi incelemek için butonlara tıklayın veya \`/yardım [kategori]\` komutunu kullanın.\n\n` +
            `\`\`\`md\n# Mevcut Kategoriler\`\`\``
        ).setFooter({ 
            text: `${client.user.username} • Yardım Sistemi • ${client.guilds.cache.size} Sunucu`, 
            iconURL: client.user.displayAvatarURL() 
        });
            
        // Her kategoriyi emoji ve özel formatlama ile ekle
        let categoryList = "";
        const categoryEmojis = {
            admin: emoji.guard,
            kullanıcı: emoji.human,         
            sistem: emoji.settings,
            müzik: emoji.music,
        };
        
        commandFolders.forEach(folder => {
            const categoryPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            const folderEmoji = categoryEmojis[folder] || '📁';
            categoryList += `${folderEmoji} **${folder.toUpperCase()}**\n`;
            categoryList += `> \`${commandFiles.length}\` komut bulunuyor\n\n`;
        });
        
        embed.setDescription(embed.data.description + categoryList);
        
        // Kategoriler için butonlar oluştur
        const row = new ActionRowBuilder();
        
        // Her kategori için bir buton ekle (max 5 buton)
        commandFolders.slice(0, 5).forEach(folder => {
            const folderEmoji = categoryEmojis[folder] || '📁';
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`help_category_${folder}`)
                    .setLabel(folder.charAt(0).toUpperCase() + folder.slice(1))
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(folderEmoji)
            );
        });
        
        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
