const chalk = require('chalk');
const fs = require('node:fs');
const path = require('node:path');
// Import Discord.js components at the top of the file
const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder 
} = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Slash komut işleme
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                
                // Embed handler'ı import et
                const embedHandler = require('../util/embedHandler')(interaction.client);
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ 
                        embeds: [embedHandler.errorEmbed('Hata', 'Bu komutu çalıştırırken bir hata oluştu!')], 
                        ephemeral: true 
                    });
                } else {
                    await interaction.reply({ 
                        embeds: [embedHandler.errorEmbed('Hata', 'Bu komutu çalıştırırken bir hata oluştu!')], 
                        ephemeral: true 
                    });
                }
            }
        }
        
        // Buton interaksiyonlarını işleme
        if (interaction.isButton()) {
            // Kayıt butonları işleme
            if (interaction.customId.startsWith('register_')) {
                await handleRegisterButton(interaction);
                return;
            }
            
            // Yardım menüsü butonlarını işleme
            if (interaction.customId === 'help_main_menu') {
                const embedHandler = require('../util/embedHandler')(interaction.client);
                const emoji = require('../util/emoji');
                
                const foldersPath = path.join(__dirname, '../commands');
                const commandFolders = fs.readdirSync(foldersPath);
                
                const categoryEmojis = {
                    admin: emoji.guard,
                    kullanıcı: emoji.human,         
                    sistem: emoji.settings,
                    müzik: emoji.music,
                };
                
                const embed = embedHandler.infoEmbed(
                    `${emoji.search} **KOMUT YARDIM MENÜSÜ**`,
                    `**Hoş geldiniz, ${interaction.user.username}!**\n` +
                    `> Bot komutlarını kategoriler halinde görüntüleyebilirsiniz.\n` +
                    `> Bir kategoriyi incelemek için butonlara tıklayın veya \`/yardım [kategori]\` komutunu kullanın.\n\n` +
                    `\`\`\`md\n# Mevcut Kategoriler\`\`\``
                ).setFooter({ 
                    text: `${interaction.client.user.username} • Yardım Sistemi • ${interaction.client.guilds.cache.size} Sunucu`, 
                    iconURL: interaction.client.user.displayAvatarURL() 
                });
                
                // Her kategoriyi emoji ve özel formatlama ile ekle
                let categoryList = "";
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
                
                await interaction.update({ embeds: [embed], components: [row] });
            } 
            // Kategori butonlarını işleme
            else if (interaction.customId.startsWith('help_category_')) {
                const category = interaction.customId.replace('help_category_', '');
                const embedHandler = require('../util/embedHandler')(interaction.client);
                const emoji = require('../util/emoji');
                
                const foldersPath = path.join(__dirname, '../commands');
                const commandFolders = fs.readdirSync(foldersPath);
                
                if (!commandFolders.includes(category)) {
                    return interaction.update({
                        content: `**⚠️ Geçersiz kategori!**\n> Mevcut kategoriler: \`${commandFolders.join('`, `')}\``,
                        embeds: [], 
                        components: []
                    });
                }
                
                const categoryPath = path.join(foldersPath, category);
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
                
                // Kategori komutları embed'ini oluştur
                const embed = embedHandler.infoEmbed(
                    `📚 **${category.toUpperCase()} KATEGORİSİ KOMUTLARI**`,
                    `> Bu kategoride toplam **${commandFiles.length}** komut bulunuyor.\n` + 
                    `> Aşağıda her komutun açıklamasını görebilirsiniz.\n\n` +
                    `\`\`\`md\n# ${category.charAt(0).toUpperCase() + category.slice(1)} Komutları\`\`\``
                ).setFooter({ 
                    text: `${interaction.client.user.username} • Komut Sistemi`, 
                    iconURL: interaction.client.user.displayAvatarURL() 
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
                
                await interaction.update({ embeds: [embed], components: [row] });
            }
            
            // Ticket butonları işleme
            if (interaction.customId === 'create_ticket') {
                await handleTicketCreation(interaction);
                return;
            }
            
            if (interaction.customId === 'close_ticket') {
                await handleTicketClose(interaction);
                return;
            }
            
            if (interaction.customId === 'delete_ticket') {
                await handleTicketDelete(interaction);
                return;
            }
            
            // Özel oda butonları işleme
            if (interaction.customId === 'create_private_room') {
                await handlePrivateRoomCreation(interaction);
                return;
            }
            
            if (interaction.customId.startsWith('private_room_')) {
                const [_, __, action, roomId] = interaction.customId.split('_');
                
                if (action === 'add') {
                    await handlePrivateRoomAddUser(interaction, roomId);
                    return;
                } else if (action === 'limit') {
                    await handlePrivateRoomLimit(interaction, roomId);
                    return;
                } else if (action === 'rename') {
                    await handlePrivateRoomRename(interaction, roomId);
                    return;
                } else if (action === 'close') {
                    await handlePrivateRoomClose(interaction, roomId);
                    return;
                }
            }
        }
        
        // Müzik araması için String Select Menu işleyicisi
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('search_')) {
            // Bu durum ara.js içinde zaten işleniyor
            return;
        }

        // Modal submit işleme
        if (interaction.isModalSubmit()) {
            // Kayıt modalları işleme
            if (interaction.customId.startsWith('modal_register_')) {
                await handleRegisterModal(interaction);
                return;
            }
            
            // Özel oda modalları işleme
            if (interaction.customId.startsWith('modal_private_room_')) {
                const parts = interaction.customId.split('_');
                const action = parts[3];
                const roomId = parts.length > 4 ? parts[4] : null;
                
                if (action === 'create') {
                    await handlePrivateRoomCreateModal(interaction);
                    return;
                } else if (action === 'add') {
                    await handlePrivateRoomAddUserModal(interaction, roomId);
                    return;
                } else if (action === 'limit') {
                    await handlePrivateRoomLimitModal(interaction, roomId);
                    return;
                } else if (action === 'rename') {
                    await handlePrivateRoomRenameModal(interaction, roomId);
                    return;
                }
            }
        }
    },
};

// Kayıt butonlarını işleme fonksiyonu
async function handleRegisterButton(interaction) {
    try {
        const { customId, guild, client } = interaction;
        const [action, type, userId] = customId.split('_');
        const emoji = require('../util/emoji');
        
        // Örnek butonlar için işlem yok
        if (userId === 'example') {
            return await interaction.reply({ 
                content: 'Bu bir örnek butondur ve herhangi bir işlem yapmaz.', 
                ephemeral: true 
            });
        }
        
        // Kayıt ayarlarını al
        const registerSettings = await getRegisterSettings(client, guild.id);
        if (!registerSettings) {
            return await interaction.reply({ 
                content: 'Kayıt sistemi ayarları bulunamadı.', 
                ephemeral: true 
            });
        }
        
        // Yetkili rolü kontrolü
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member || !member.roles.cache.has(registerSettings.staff_role_id)) {
            return await interaction.reply({ 
                content: `Bu işlemi gerçekleştirmek için **<@&${registerSettings.staff_role_id}>** rolüne sahip olmanız gerekiyor.`, 
                ephemeral: true 
            });
        }
        
        // Kayıt edilecek üyeyi al
        const targetUser = await client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return await interaction.reply({ 
                content: 'Kayıt edilecek kullanıcı bulunamadı.', 
                ephemeral: true 
            });
        }
        
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return await interaction.reply({ 
                content: 'Kullanıcı sunucuda bulunamadı.', 
                ephemeral: true 
            });
        }
        
        // Kayıt tipi kontrolü (erkek/kız rolü yoksa o tür seçilemez)
        if ((type === 'male' && !registerSettings.male_role_id) || 
            (type === 'female' && !registerSettings.female_role_id)) {
            return await interaction.reply({ 
                content: `Bu kayıt türü için gerekli rol ayarlanmamış.`, 
                ephemeral: true 
            });
        }
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId(`modal_register_${type}_${userId}`)
            .setTitle(
                type === 'male' ? 'Erkek Üye Kaydı' : 
                type === 'female' ? 'Kız Üye Kaydı' : 
                'Üye Kaydı'
            );
            
        // İsim giriş alanı
        const nameInput = new TextInputBuilder()
            .setCustomId('name')
            .setLabel('İsim')
            .setPlaceholder('Üyenin ismi')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(32);
            
        // Yaş giriş alanı
        const ageInput = new TextInputBuilder()
            .setCustomId('age')
            .setLabel('Yaş')
            .setPlaceholder('Üyenin yaşı')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(3);
            
        // Action row'ları oluştur
        const firstRow = new ActionRowBuilder().addComponents(nameInput);
        const secondRow = new ActionRowBuilder().addComponents(ageInput);
        
        // Modal'a action row'ları ekle
        modal.addComponents(firstRow, secondRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error(`Kayıt butonu hatası: ${error}`);
        await interaction.reply({ 
            content: 'İşlem sırasında bir hata oluştu.', 
            ephemeral: true 
        });
    }
}

// Kayıt modallarını işleme fonksiyonu
async function handleRegisterModal(interaction) {
    try {
        const { customId, guild, client } = interaction;
        const [_, __, type, userId] = customId.split('_');
        const emoji = require('../util/emoji');
        
        // Kayıt ayarlarını al
        const registerSettings = await getRegisterSettings(client, guild.id);
        if (!registerSettings) {
            return await interaction.reply({ 
                content: 'Kayıt sistemi ayarları bulunamadı.', 
                ephemeral: true 
            });
        }
        
        // Log kanalını al
        const logChannel = guild.channels.cache.get(registerSettings.log_channel_id);
        if (!logChannel) {
            return await interaction.reply({ 
                content: 'Kayıt log kanalı bulunamadı.', 
                ephemeral: true 
            });
        }
        
        // Form verilerini al
        const name = interaction.fields.getTextInputValue('name');
        const age = interaction.fields.getTextInputValue('age');
        
        // Yaş kontrolü
        if (isNaN(age) || parseInt(age) < 1 || parseInt(age) > 100) {
            return await interaction.reply({ 
                content: 'Lütfen geçerli bir yaş giriniz (1-100).', 
                ephemeral: true 
            });
        }
        
        // Yetkili rolü kontrolü
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member || !member.roles.cache.has(registerSettings.staff_role_id)) {
            return await interaction.reply({ 
                content: `Bu işlemi gerçekleştirmek için **<@&${registerSettings.staff_role_id}>** rolüne sahip olmanız gerekiyor.`, 
                ephemeral: true 
            });
        }
        
        // Kayıt edilecek üyeyi al
        const targetUser = await client.users.fetch(userId).catch(() => null);
        if (!targetUser) {
            return await interaction.reply({ 
                content: 'Kayıt edilecek kullanıcı bulunamadı.', 
                ephemeral: true 
            });
        }
        
        const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            return await interaction.reply({ 
                content: 'Kullanıcı sunucuda bulunamadı.', 
                ephemeral: true 
            });
        }
        
        // Verilecek rolleri belirle
        const rolesToAdd = [];
        rolesToAdd.push(registerSettings.member_role_id);
        
        let roleDesc = "Üye";
        if (type === 'male' && registerSettings.male_role_id) {
            rolesToAdd.push(registerSettings.male_role_id);
            roleDesc = "Erkek";
        } else if (type === 'female' && registerSettings.female_role_id) {
            rolesToAdd.push(registerSettings.female_role_id);
            roleDesc = "Kız";
        }
        
        // Kullanıcıya rolleri ver ve ismini değiştir
        try {
            // Tüm eski rolleri temizle (except roles with ADMINISTRATOR permission)
            const rolesToRemove = targetMember.roles.cache.filter(role => 
                role.id !== guild.id && !role.permissions.has('Administrator')).map(role => role.id);
            
            if (rolesToRemove.length > 0) {
                await targetMember.roles.remove(rolesToRemove);
            }
            
            // Yeni rolleri ekle
            await targetMember.roles.add(rolesToAdd);
            
            // İsmi değiştir - "İsim | Yaş" formatında
            const newNickname = `${name} | ${age}`;
            if (newNickname.length <= 32) { // Discord nickname limit
                await targetMember.setNickname(newNickname);
            }
            
            // Kullanıcıya bilgilendirme mesajı gönder
            const embedHandler = require('../util/embedHandler')(client);
            const embed = embedHandler.successEmbed(
                `${emoji.done || '✅'} Kayıt Tamamlandı!`,
                `**${targetUser.tag}** kullanıcısı başarıyla kayıt edildi.\n\n` +
                `**İsim:** ${name}\n` +
                `**Yaş:** ${age}\n` +
                `**Tür:** ${roleDesc}\n\n` +
                `Kayıt işleminiz tamamlandı. İyi eğlenceler dileriz!`
            );
            
            // Kayıt log mesajı
            const logEmbed = embedHandler.infoEmbed(
                `${emoji.archive || '📝'} Kayıt İşlemi Yapıldı`,
                `**Kaydedilen Kullanıcı:** ${targetUser} (${targetUser.tag})\n` +
                `**Kaydeden Yetkili:** ${interaction.user} (${interaction.user.tag})\n` +
                `**İsim:** ${name}\n` +
                `**Yaş:** ${age}\n` +
                `**Tür:** ${roleDesc}\n\n` +
                `${new Date().toLocaleString('tr-TR')}`
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: `Kullanıcı ID: ${targetUser.id} • Yetkili ID: ${interaction.user.id}` });
            
            // Log kanalına mesajı gönder
            await logChannel.send({ embeds: [logEmbed] });
            
            // Etkileşime cevap ver
            return await interaction.reply({ 
                embeds: [embed], 
                ephemeral: false 
            });
        } catch (error) {
            console.error(`Kayıt işlemi hatası: ${error}`);
            return await interaction.reply({ 
                content: `Kayıt işlemi sırasında bir hata oluştu: ${error.message}`, 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error(`Kayıt modal işleme hatası: ${error}`);
        
        // Eğer interaction henüz yanıtlanmadıysa
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'İşlem sırasında bir hata oluştu.', 
                ephemeral: true 
            });
        } else {
            await interaction.followUp({ 
                content: 'İşlem sırasında bir hata oluştu.', 
                ephemeral: true 
            });
        }
    }
}

// Kayıt ayarlarını getiren fonksiyon
async function getRegisterSettings(client, guildId) {
    try {
        const { database_type } = require('../config.json');
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        let registerSettings = null;
        
        if (useMySQL) {
            try {
                const results = await client.db.select('register_settings', { guild_id: guildId });
                if (results && results.length > 0) {
                    registerSettings = results[0];
                }
            } catch (err) {
                console.error(global.hata(`Kayıt ayarları alınırken MySQL hatası: ${err.message}`));
            }
        } else {
            // Sadece MySQL aktif DEĞİLSE yerel veritabanını kullan
            const staffRoleId = client.localDB.getData("register_settings", `staff_role_id_${guildId}`);
            
            if (staffRoleId) {
                registerSettings = {
                    staff_role_id: staffRoleId,
                    register_channel_id: client.localDB.getData("register_settings", `register_channel_id_${guildId}`),
                    log_channel_id: client.localDB.getData("register_settings", `log_channel_id_${guildId}`),
                    member_role_id: client.localDB.getData("register_settings", `member_role_id_${guildId}`),
                    male_role_id: client.localDB.getData("register_settings", `male_role_id_${guildId}`),
                    female_role_id: client.localDB.getData("register_settings", `female_role_id_${guildId}`)
                };
            }
        }
        
        return registerSettings;
    } catch (error) {
        console.error(global.hata(`Kayıt ayarları alınırken hata: ${error.message}`));
        return null;
    }
}

// Ticket oluşturma işleme fonksiyonu
async function handleTicketCreation(interaction) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Ticket ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('ticket_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("ticket_settings", `ticket.${guildID}.settings`);
        }
        
        if (!settings) {
            return interaction.reply({ 
                content: '❌ Ticket sistemi düzgün yapılandırılmamış. Lütfen bir yöneticiye bildirin.', 
                ephemeral: true 
            });
        }
        
        // MySQL ve LocalDB için ortak veri yapısı oluştur
        const categoryId = useMySQL ? settings.category_id : settings.categoryId;
        const staffRoleId = useMySQL ? settings.staff_role_id : settings.staffRoleId;
        const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
        const welcomeMessage = settings.welcomeMessage || settings.welcome_message;
        const embedColor = settings.embedColor || settings.embed_color;
        
        // Kullanıcının zaten aktif bir ticket'ı var mı kontrol et
        let existingTicket;
        
        if (useMySQL) {
            const tickets = await client.db.select('tickets', { guild_id: guildID, user_id: user.id, status: 'open' });
            existingTicket = tickets && tickets.length > 0;
        } else {
            // localDBHandler.hasOpenTicket fonksiyonu olmadığı için doğrudan kontrol edelim
            const tickets = await localDBHandler.getData("ticket_settings", `ticket.${guildID}.tickets`) || {};
            existingTicket = Object.values(tickets).some(
                ticket => ticket.userId === user.id && ticket.status === 'open'
            );
        }
        
        if (existingTicket) {
            return interaction.reply({ 
                content: '❌ Zaten aktif bir ticket\'ınız bulunuyor!', 
                ephemeral: true 
            });
        }
        
        // Ticket kanalı oluştur
        const category = guild.channels.cache.get(categoryId);
        if (!category) {
            return interaction.reply({ 
                content: '❌ Ticket kategorisi bulunamadı. Lütfen bir yöneticiye bildirin.', 
                ephemeral: true 
            });
        }
        
        // Ticket adını oluştur
        let ticketCount;
        if (useMySQL) {
            // En son ticket numarasını bul
            const result = await client.db.query('SELECT MAX(ticket_number) as lastNumber FROM tickets WHERE guild_id = ?', [guildID]);
            const lastNumber = result && result.length > 0 && result[0].lastNumber ? result[0].lastNumber : 0;
            
            ticketCount = lastNumber + 1;
        } else {
            // incrementTicketNumber fonksiyonu olmadığı için doğrudan yapalım
            let nextNumber = await localDBHandler.getData("ticket_settings", `ticket.${guildID}.nextTicketNumber`) || 1;
            await localDBHandler.insertData("ticket_settings", `ticket.${guildID}.nextTicketNumber`, nextNumber + 1);
            ticketCount = nextNumber;
        }
        
        // Kanal izinleri ayarla
        const channelPermissions = [
            {
                id: guild.roles.everyone.id,
                deny: ['ViewChannel']
            },
            {
                id: staffRoleId,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            },
            {
                id: user.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
            },
            {
                id: guild.members.me.id,
                allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageChannels', 'EmbedLinks']
            }
        ];
        
        // Kanalı oluştur
        const ticketChannel = await guild.channels.create({
            name: `ticket-${ticketCount}`,
            type: 0, // Text Channel
            parent: categoryId,
            permissionOverwrites: channelPermissions,
            reason: `${user.tag} tarafından ticket oluşturuldu`
        });
        
        // Ticket verilerini kaydet
        const ticketData = {
            channelId: ticketChannel.id,
            userId: user.id,
            ticketNumber: ticketCount,
            createdAt: new Date().toISOString(),
            status: 'open'
        };
        
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const createdAtMySQLFormat = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'INSERT INTO tickets (guild_id, channel_id, user_id, ticket_number, created_at, status) VALUES (?, ?, ?, ?, ?, ?)',
                [guildID, ticketChannel.id, user.id, ticketCount, createdAtMySQLFormat, 'open']
            );
        } else {
            await localDBHandler.insertData("tickets", `ticket.${guildID}.tickets.${ticketChannel.id}`, ticketData);
        }
        
        // Butonları oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Ticket\'ı Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.lock)
            );
            
        // Karşılama mesajı gönder
        await ticketChannel.send({
            content: `<@${user.id}> | <@&${staffRoleId}>`,
            embeds: [{
                title: `${emoji.ticket || '🎫'} Ticket #${ticketCount}`,
                description: welcomeMessage,
                color: embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea,
                footer: {
                    text: `${guild.name} • Ticket Sistemi`,
                    icon_url: guild.iconURL({ dynamic: true })
                },
                timestamp: new Date()
            }],
            components: [row]
        });
        
        // Log kanalına bildir
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send({
                embeds: [{
                    title: '🎫 Yeni Ticket Oluşturuldu',
                    description: `**Ticket:** ${ticketChannel}\n**Kullanıcı:** ${user} (${user.tag})`,
                    color: 0x5768ea,
                    footer: {
                        text: `Ticket #${ticketCount}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
        
        // Kullanıcıya bildir
        return interaction.reply({ 
            content: `${emoji.done2} Ticket'ınız oluşturuldu: ${ticketChannel}`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error(global.hata(`Ticket oluşturma hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed} Ticket oluşturulurken bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Ticket kapatma işleme fonksiyonu
async function handleTicketClose(interaction) {
    try {
        const { client, guild, channel, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Ticket verilerini kontrol et
        let ticketData;
        
        if (useMySQL) {
            const result = await client.db.select('tickets', { guild_id: guildID, channel_id: channel.id });
            ticketData = result && result.length > 0 ? result[0] : null;
        } else {
            // getTicketData fonksiyonu olmadığı için doğrudan alalım
            ticketData = await localDBHandler.getData("tickets", `ticket.${guildID}.tickets.${channel.id}`);
        }
        
        if (!ticketData) {
            return interaction.reply({ 
                content: `${emoji.closed} Bu kanal bir ticket değil veya veritabanında bulunamadı.`, 
                ephemeral: true 
            });
        }
        
        // Ticket ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('ticket_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("ticket_settings", `ticket.${guildID}.settings`);
        }
        
        // Ticket'ı kapatılmış olarak işaretle
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const closedAtMySQLFormat = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'UPDATE tickets SET status = ?, closed_by = ?, closed_at = ? WHERE guild_id = ? AND channel_id = ?',
                ['closed', user.id, closedAtMySQLFormat, guildID, channel.id]
            );
        } else {
            ticketData.status = 'closed';
            ticketData.closedBy = user.id;
            ticketData.closedAt = new Date().toISOString();
            await localDBHandler.insertData("tickets", `ticket.${guildID}.tickets.${channel.id}`, ticketData);
        }
        
        // Ticket kanalının izinlerini güncelle
        const ticketOwner = ticketData.userId || ticketData.user_id;
        await channel.permissionOverwrites.edit(ticketOwner, { SendMessages: false });
        
        // Butonları güncelle
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('delete_ticket')
                    .setLabel('Ticket\'ı Sil')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.trash)
            );
            
        // Kapatma mesajı gönder
        await interaction.reply({
            embeds: [{
                title: `${emoji.lock} Ticket Kapatıldı`,
                description: `Bu ticket ${user} tarafından kapatılmıştır.\n\nTicket'ı tamamen silmek için aşağıdaki butonu kullanabilirsiniz.`,
                color: 0xED4245,
                timestamp: new Date()
            }],
            components: [row]
        });
        
        // Log kanalına bildir
        if (settings) {
            const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
            const logChannel = guild.channels.cache.get(logChannelId);
            if (logChannel) {
                logChannel.send({
                    embeds: [{
                        title: `${emoji.lock} Ticket Kapatıldı`,
                        description: `**Ticket:** ${channel.name}\n**Kapatan:** ${user} (${user.tag})\n**Ticket Sahibi:** <@${ticketOwner}>`,
                        color: 0xED4245,
                        footer: {
                            text: `Ticket #${ticketData.ticketNumber || ticketData.ticket_number}`,
                            icon_url: guild.iconURL({ dynamic: true })
                        },
                        timestamp: new Date()
                    }]
                });
            }
        }
    } catch (error) {
        console.error(global.hata(`Ticket kapatma hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.close} Ticket kapatılırken bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Ticket silme işleme fonksiyonu
async function handleTicketDelete(interaction) {
    try {
        const { client, guild, channel, user } = interaction;
        const guildID = guild.id;
        const { database_type } = require('../config.json');
        const emoji = require('../util/emoji');
        const localDBHandler = require('../util/localDBHandler');
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Ticket verilerini kontrol et
        let ticketData;
        
        if (useMySQL) {
            const result = await client.db.select('tickets', { guild_id: guildID, channel_id: channel.id });
            ticketData = result && result.length > 0 ? result[0] : null;
        } else {
            ticketData = await localDBHandler.getData("tickets", `ticket.${guildID}.tickets.${channel.id}`);
        }
        
        if (!ticketData) {
            return interaction.reply({ 
                content: `${emoji.close} Bu kanal bir ticket değil veya veritabanında bulunamadı.`, 
                ephemeral: true 
            });
        }
        
        // Ticket'ın durumunu kontrol et
        const ticketStatus = useMySQL ? ticketData.status : ticketData.status;
        
        if (ticketStatus !== 'closed') {
            return interaction.reply({ 
                content: `${emoji.close} Bu ticket henüz kapatılmamış! Önce kapatmanız gerekiyor.`, 
                ephemeral: true 
            });
        }
        
        // Ticket ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('ticket_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("ticket_settings", `ticket.${guildID}.settings`);
        }
        
        // Log kanalını bul
        let logChannel;
        if (settings) {
            const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
            logChannel = guild.channels.cache.get(logChannelId);
        }
        
        // Silme bilgisini güncelle
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const deletedAtMySQLFormat = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'DELETE FROM tickets WHERE guild_id = ? AND channel_id = ?',
                [guildID, channel.id]
            );
        } else {
            ticketData.status = 'deleted';
            ticketData.deletedBy = user.id;
            ticketData.deletedAt = new Date().toISOString();
            await localDBHandler.deleteData("tickets", `ticket.${guildID}.tickets.${channel.id}`, ticketData);
        }
        
        // Log kanalına bildir
        if (logChannel) {
            const ticketOwner = ticketData.userId || ticketData.user_id;
            const ticketNumber = ticketData.ticketNumber || ticketData.ticket_number;
            
            await logChannel.send({
                embeds: [{
                    title: `${emoji.trash} Ticket Silindi`,
                    description: `**Ticket:** ${channel.name}\n**Silen:** ${user} (${user.tag})\n**Ticket Sahibi:** <@${ticketOwner}>`,
                    color: 0xED4245,
                    footer: {
                        text: `Ticket #${ticketNumber}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
        
        // Kullanıcıya bildir ve kanalı sil
        await interaction.reply({ content: `${emoji.done2} Ticket silinecek...` });
        
        // 5 saniye bekle ve kanalı sil
        setTimeout(async () => {
            try {
                await channel.delete(`Ticket ${user.tag} tarafından silindi`);
            } catch (error) {
                console.error(global.hata(`Ticket kanal silme hatası: ${error}`));
                // Kanal zaten silinmiş olabilir, bu hatayı görmezden gel
            }
        }, 5000);
        
    } catch (error) {
        console.error(global.hata(`Ticket silme hatası: ${error}`));
        return interaction.reply({ 
            content: '❌ Ticket silinirken bir hata oluştu!', 
            ephemeral: true 
        });
    }
}

// Özel oda oluşturma butonu işleme
async function handlePrivateRoomCreation(interaction) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Özel oda ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('private_room_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
        }
        
        if (!settings) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Özel oda sistemi düzgün yapılandırılmamış. Lütfen bir yöneticiye bildirin.`, 
                ephemeral: true 
            });
        }
        
        // MySQL ve LocalDB için ortak veri yapısı oluştur
        const categoryId = useMySQL ? settings.category_id : settings.categoryId;
        const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
        const maxRooms = useMySQL ? settings.max_rooms_per_user : settings.maxRoomsPerUser;
        
        // Kullanıcının kaç odası var kontrol et
        let userRoomsCount = 0;
        
        if (useMySQL) {
            const result = await client.db.query('SELECT COUNT(*) as count FROM private_rooms WHERE guild_id = ? AND owner_id = ? AND status = ?', 
                [guildID, user.id, 'active']);
                
            userRoomsCount = result && result.length > 0 ? result[0].count : 0;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            userRoomsCount = Object.values(rooms).filter(room => 
                room.ownerId === user.id && room.status === 'active'
            ).length;
        }
        
        if (userRoomsCount >= maxRooms) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Maksimum oda sayısına ulaştınız! En fazla ${maxRooms} özel odanız olabilir.`, 
                ephemeral: true 
            });
        }
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId('modal_private_room_create')
            .setTitle('Özel Oda Oluşturma');
            
        // Oda ismi giriş alanı
        const nameInput = new TextInputBuilder()
            .setCustomId('room_name')
            .setLabel('Oda İsmi')
            .setPlaceholder('Oda isminizi girin (Örn: Sohbet Odası)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(32);
            
        // Kullanıcı limiti giriş alanı
        const limitInput = new TextInputBuilder()
            .setCustomId('user_limit')
            .setLabel('Kullanıcı Limiti')
            .setPlaceholder('Maksimum kaç kişi girebilir? (0-99, 0 = limitsiz)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(2);
            
        // Action row'ları oluştur
        const firstRow = new ActionRowBuilder().addComponents(nameInput);
        const secondRow = new ActionRowBuilder().addComponents(limitInput);
        
        // Modal'a action row'ları ekle
        modal.addComponents(firstRow, secondRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error(global.hata(`Özel oda oluşturma hatası: ${error}`));
        return interaction.reply({ 
            content: '❌ Özel oda oluşturulurken bir hata oluştu!', 
            ephemeral: true 
        });
    }
}

// Özel oda oluşturma modal işleme
async function handlePrivateRoomCreateModal(interaction) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const roomName = interaction.fields.getTextInputValue('room_name');
        const userLimit = parseInt(interaction.fields.getTextInputValue('user_limit'));
        
        // Limit kontrolü
        if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Geçersiz kullanıcı limiti! 0 ile 99 arasında bir sayı girmelisiniz (0 = limitsiz).`, 
                ephemeral: true 
            });
        }
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Özel oda ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('private_room_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
        }
        
        if (!settings) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Özel oda sistemi düzgün yapılandırılmamış. Lütfen bir yöneticiye bildirin.`, 
                ephemeral: true 
            });
        }
        
        // MySQL ve LocalDB için ortak veri yapısı oluştur
        const categoryId = useMySQL ? settings.category_id : settings.categoryId;
        const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
        
        // Kanal izinleri ayarla
        const channelPermissions = [
            {
                id: guild.roles.everyone.id,
                deny: ['ViewChannel', 'Connect']
            },
            {
                id: user.id,
                allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers', 'DeafenMembers', 'MoveMembers']
            },
            {
                id: guild.members.me.id,
                allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'ManageChannels', 'ManageRoles']
            }
        ];
        
        // Odayı oluştur
        const voiceChannel = await guild.channels.create({
            name: roomName,
            type: 2, // Voice Channel
            parent: categoryId,
            userLimit: userLimit,
            permissionOverwrites: channelPermissions,
            reason: `${user.tag} tarafından özel oda oluşturuldu`
        });
        
        // Oda ID'sini ve kullanıcı limiti veritabanına kaydet
        const roomId = voiceChannel.id;
        const createdAt = new Date();
        
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const createdAtMySQLFormat = createdAt.toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'INSERT INTO private_rooms (guild_id, channel_id, owner_id, room_name, user_limit, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildID, roomId, user.id, roomName, userLimit, createdAtMySQLFormat, 'active']
            );
        } else {
            const roomData = {
                channelId: roomId,
                ownerId: user.id,
                roomName: roomName,
                userLimit: userLimit,
                createdAt: createdAt.toISOString(),
                status: 'active'
            };
            
            // Odalar için veri yapısı var mı kontrol et
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            rooms[roomId] = roomData;
            await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
        }
        
        // Odanın kontrol panelini oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`private_room_add_${roomId}`)
                    .setLabel('Kullanıcı Ekle/Sil')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(emoji.userPlus || '👥'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_limit_${roomId}`)
                    .setLabel('Oda Sınırı Ayarla')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(emoji.gear || '⚙️'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_rename_${roomId}`)
                    .setLabel('Oda İsmini Değiştir')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emoji.edit || '✏️'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_close_${roomId}`)
                    .setLabel('Odayı Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.trash || '🗑️')
            );
        
        // Odayı oluşturan kullanıcıya bilgi mesajı
        const embedColor = useMySQL ? settings.embed_color : settings.embedColor;
        
        const embed = new EmbedBuilder()
            .setTitle(`${emoji.door || '🚪'} Özel Odanız Oluşturuldu!`)
            .setDescription(`## ${roomName}\n\nOdanızı kontrol etmek için aşağıdaki butonları kullanabilirsiniz:
            
- **Kullanıcı Ekle/Sil**: Odanıza özel olarak kullanıcı ekleyin veya çıkarın
- **Oda Sınırı Ayarla**: Odanıza maksimum kaç kişi girebileceğini belirleyin
- **Oda İsmini Değiştir**: Odanızın ismini istediğiniz gibi değiştirin
- **Odayı Kapat**: Odanızı kalıcı olarak silin`)
            .setColor(embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea)
            .setFooter({
                text: `${guild.name} • Özel Oda Sistemi`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        
        // Önce kullanıcının DM'sine göndermeyi dene
        await interaction.reply({ 
            embeds: [embed],
            components: [row],
            ephemeral: true 
        });
        
        
        // Log kanalına bilgi mesajı
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send({
                embeds: [{
                    title: `${emoji.door || '🚪'} Yeni Özel Oda Oluşturuldu`,
                    description: `**Oda:** ${voiceChannel}\n**Sahibi:** ${user} (${user.tag})\n**Kullanıcı Limiti:** ${userLimit === 0 ? 'Limitsiz' : userLimit}`,
                    color: embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea,
                    footer: {
                        text: `Oda ID: ${roomId}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
    } catch (error) {
        console.error(global.hata(`Özel oda oluşturma işleme hatası: ${error}`));
        return interaction.reply({ 
            content: `❌ Özel oda oluşturulurken bir hata oluştu: ${error.message}`,
            ephemeral: true 
        });
    }
}

// Oda ismini değiştirme butonu işleme
async function handlePrivateRoomRename(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odanın sahibi siz değilsiniz!`, 
                ephemeral: true 
            });
        }
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId(`modal_private_room_rename_${roomId}`)
            .setTitle('Oda İsmini Değiştir');
            
        // İsim giriş alanı
        const nameInput = new TextInputBuilder()
            .setCustomId('room_name')
            .setLabel('Yeni Oda İsmi')
            .setPlaceholder('Odanızın yeni ismini girin')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(32);
            
        // Action row oluştur
        const firstRow = new ActionRowBuilder().addComponents(nameInput);
        
        // Modal'a action row'u ekle
        modal.addComponents(firstRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error(global.hata(`Özel oda isim değiştirme hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Oda ismi değiştirme modal işleme
async function handlePrivateRoomRenameModal(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const newRoomName = interaction.fields.getTextInputValue('room_name');
        
        // Kanalı kontrol et
        const channel = guild.channels.cache.get(roomId);
        if (!channel) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu kanal bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Oda ismini güncelle
        await channel.edit({
            name: newRoomName
        });
        
        // Veritabanı bilgilerini güncelle
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            await client.db.query(
                'UPDATE private_rooms SET room_name = ? WHERE guild_id = ? AND channel_id = ?',
                [newRoomName, guildID, roomId]
            );
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            if (rooms[roomId]) {
                rooms[roomId].roomName = newRoomName;
                await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
            }
        }
        
        return interaction.reply({ 
            content: `${emoji.done2 || '✅'} Özel odanızın ismi başarıyla "${newRoomName}" olarak değiştirildi!`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error(global.hata(`Özel oda isim değiştirme modal hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Odayı kapatma butonu işleme
async function handlePrivateRoomClose(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odayı kapatmak için oda sahibi veya yönetici olmanız gerekiyor!`, 
                ephemeral: true 
            });
        }
        
        // Kanalı kontrol et
        const channel = guild.channels.cache.get(roomId);
        if (!channel) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu kanal bulunamadı veya zaten silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Özel oda ayarlarını al
        let settings;
        if (useMySQL) {
            const result = await client.db.select('private_room_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
        }
        
        // Log kanalını bul
        let logChannel;
        if (settings) {
            const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
            logChannel = guild.channels.cache.get(logChannelId);
        }
        
        // Veritabanı bilgilerini güncelle
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const closedAtMySQLFormat = new Date().toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'UPDATE private_rooms SET status = ?, closed_by = ?, closed_at = ? WHERE guild_id = ? AND channel_id = ?',
                ['closed', user.id, closedAtMySQLFormat, guildID, roomId]
            );
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            if (rooms[roomId]) {
                rooms[roomId].status = 'closed';
                rooms[roomId].closedBy = user.id;
                rooms[roomId].closedAt = new Date().toISOString();
                await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
            }
        }
        
        // Kullanıcıya bildir ve odayı kapat
        await interaction.reply({ 
            content: `${emoji.done2 || '✅'} Özel odanız kapatılıyor...`, 
            ephemeral: true 
        });
        
        // Log kanalına bilgi gönder
        if (logChannel) {
            const roomName = useMySQL ? roomData.room_name : roomData.roomName;
            
            await logChannel.send({
                embeds: [{
                    title: `${emoji.trash || '🗑️'} Özel Oda Kapatıldı`,
                    description: `**Oda:** ${channel.name}\n**Kapatan:** ${user} (${user.tag})\n**Oda Sahibi:** <@${ownerId}>`,
                    color: 0xED4245,
                    footer: {
                        text: `Oda ID: ${roomId}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
        
        // Oda içindeki üyeleri çıkar
        if (channel.type === 2) { // Sesli kanal
            if (channel.members.size > 0) {
                channel.members.forEach(async (member) => {
                    try {
                        await member.voice.disconnect('Özel oda kapatıldı');
                    } catch (error) {
                        console.error(global.hata(`Üye kanaldan çıkarılırken hata: ${error}`));
                    }
                });
            }
        }
        
        // Kanalı sil
        setTimeout(async () => {
            try {
                await channel.delete(`Özel oda ${user.tag} tarafından kapatıldı`);
            } catch (error) {
                console.error(global.hata(`Özel oda silme hatası: ${error}`));
            }
        }, 2000);
    } catch (error) {
        console.error(global.hata(`Özel oda kapatma hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Özel oda oluşturma modal işleme
async function handlePrivateRoomCreateModal(interaction) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const roomName = interaction.fields.getTextInputValue('room_name');
        const userLimit = parseInt(interaction.fields.getTextInputValue('user_limit'));
        
        // Limit kontrolü
        if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Geçersiz kullanıcı limiti! 0 ile 99 arasında bir sayı girmelisiniz (0 = limitsiz).`, 
                ephemeral: true 
            });
        }
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Özel oda ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('private_room_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
        }
        
        if (!settings) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Özel oda sistemi düzgün yapılandırılmamış. Lütfen bir yöneticiye bildirin.`, 
                ephemeral: true 
            });
        }
        
        // MySQL ve LocalDB için ortak veri yapısı oluştur
        const categoryId = useMySQL ? settings.category_id : settings.categoryId;
        const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
        
        // Kanal izinleri ayarla
        const channelPermissions = [
            {
                id: guild.roles.everyone.id,
                deny: ['ViewChannel', 'Connect']
            },
            {
                id: user.id,
                allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers', 'DeafenMembers', 'MoveMembers']
            },
            {
                id: guild.members.me.id,
                allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'ManageChannels', 'ManageRoles']
            }
        ];
        
        // Odayı oluştur
        const voiceChannel = await guild.channels.create({
            name: roomName,
            type: 2, // Voice Channel
            parent: categoryId,
            userLimit: userLimit,
            permissionOverwrites: channelPermissions,
            reason: `${user.tag} tarafından özel oda oluşturuldu`
        });
        
        // Oda ID'sini ve kullanıcı limiti veritabanına kaydet
        const roomId = voiceChannel.id;
        const createdAt = new Date();
        
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const createdAtMySQLFormat = createdAt.toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'INSERT INTO private_rooms (guild_id, channel_id, owner_id, room_name, user_limit, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildID, roomId, user.id, roomName, userLimit, createdAtMySQLFormat, 'active']
            );
        } else {
            const roomData = {
                channelId: roomId,
                ownerId: user.id,
                roomName: roomName,
                userLimit: userLimit,
                createdAt: createdAt.toISOString(),
                status: 'active'
            };
            
            // Odalar için veri yapısı var mı kontrol et
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            rooms[roomId] = roomData;
            await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
        }
        
        // Odanın kontrol panelini oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`private_room_add_${roomId}`)
                    .setLabel('Kullanıcı Ekle/Sil')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(emoji.userPlus || '👥'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_limit_${roomId}`)
                    .setLabel('Oda Sınırı Ayarla')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(emoji.gear || '⚙️'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_rename_${roomId}`)
                    .setLabel('Oda İsmini Değiştir')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emoji.edit || '✏️'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_close_${roomId}`)
                    .setLabel('Odayı Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.trash || '🗑️')
            );
        
        // Odayı oluşturan kullanıcıya bilgi mesajı
        const embedColor = useMySQL ? settings.embed_color : settings.embedColor;
        
        const embed = new EmbedBuilder()
            .setTitle(`${emoji.door || '🚪'} Özel Odanız Oluşturuldu!`)
            .setDescription(`## ${roomName}\n\nOdanızı kontrol etmek için aşağıdaki butonları kullanabilirsiniz:
            
- **Kullanıcı Ekle/Sil**: Odanıza özel olarak kullanıcı ekleyin veya çıkarın
- **Oda Sınırı Ayarla**: Odanıza maksimum kaç kişi girebileceğini belirleyin
- **Oda İsmini Değiştir**: Odanızın ismini istediğiniz gibi değiştirin
- **Odayı Kapat**: Odanızı kalıcı olarak silin`)
            .setColor(embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea)
            .setFooter({
                text: `${guild.name} • Özel Oda Sistemi`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        
            await interaction.reply({ 
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
            
        
        // Log kanalına bilgi mesajı
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send({
                embeds: [{
                    title: `${emoji.door || '🚪'} Yeni Özel Oda Oluşturuldu`,
                    description: `**Oda:** ${voiceChannel}\n**Sahibi:** ${user} (${user.tag})\n**Kullanıcı Limiti:** ${userLimit === 0 ? 'Limitsiz' : userLimit}`,
                    color: embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea,
                    footer: {
                        text: `Oda ID: ${roomId}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
    } catch (error) {
        console.error(global.hata(`Özel oda oluşturma işleme hatası: ${error}`));
        return interaction.reply({ 
            content: `❌ Özel oda oluşturulurken bir hata oluştu: ${error.message}`,
            ephemeral: true 
        });
    }
}

// Özel odaya kullanıcı ekleme/silme butonu işleme
async function handlePrivateRoomAddUser(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odanın sahibi siz değilsiniz!`, 
                ephemeral: true 
            });
        }
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId(`modal_private_room_add_${roomId}`)
            .setTitle('Kullanıcı Ekle veya Sil');
            
        // Kullanıcı ID giriş alanı
        const userIdInput = new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('Kullanıcı ID')
            .setPlaceholder('Eklemek veya silmek istediğiniz kullanıcının ID\'sini girin')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        // İşlem seçimi
        const actionInput = new TextInputBuilder()
            .setCustomId('action')
            .setLabel('İşlem (ekle/sil)')
            .setPlaceholder('ekle veya sil yazın')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        // Action row'ları oluştur
        const firstRow = new ActionRowBuilder().addComponents(userIdInput);
        const secondRow = new ActionRowBuilder().addComponents(actionInput);
        
        // Modal'a action row'ları ekle
        modal.addComponents(firstRow, secondRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error(global.hata(`Özel oda kullanıcı ekleme hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Oda sınırını ayarlama butonu işleme
async function handlePrivateRoomLimit(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odanın sahibi siz değilsiniz!`, 
                ephemeral: true 
            });
        }
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId(`modal_private_room_limit_${roomId}`)
            .setTitle('Oda Kullanıcı Limiti');
            
        // Limit giriş alanı
        const limitInput = new TextInputBuilder()
            .setCustomId('user_limit')
            .setLabel('Kullanıcı Limiti')
            .setPlaceholder('Maksimum kaç kişi girebilir? (0-99, 0 = limitsiz)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(2);
            
        // Action row oluştur
        const firstRow = new ActionRowBuilder().addComponents(limitInput);
        
        // Modal'a action row'u ekle
        modal.addComponents(firstRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error(global.hata(`Özel oda sınırı ayarlama hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Özel oda oluşturma modal işleme
async function handlePrivateRoomCreateModal(interaction) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const roomName = interaction.fields.getTextInputValue('room_name');
        const userLimit = parseInt(interaction.fields.getTextInputValue('user_limit'));
        
        // Limit kontrolü
        if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Geçersiz kullanıcı limiti! 0 ile 99 arasında bir sayı girmelisiniz (0 = limitsiz).`, 
                ephemeral: true 
            });
        }
        
        // Veritabanı kullanılabilirliğini kontrol et
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        // Özel oda ayarlarını al
        let settings;
            
        if (useMySQL) {
            const result = await client.db.select('private_room_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
        }
        
        if (!settings) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Özel oda sistemi düzgün yapılandırılmamış. Lütfen bir yöneticiye bildirin.`, 
                ephemeral: true 
            });
        }
        
        // MySQL ve LocalDB için ortak veri yapısı oluştur
        const categoryId = useMySQL ? settings.category_id : settings.categoryId;
        const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
        
        // Kanal izinleri ayarla
        const channelPermissions = [
            {
                id: guild.roles.everyone.id,
                deny: ['ViewChannel', 'Connect']
            },
            {
                id: user.id,
                allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers', 'DeafenMembers', 'MoveMembers']
            },
            {
                id: guild.members.me.id,
                allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'UseVAD', 'ManageChannels', 'ManageRoles']
            }
        ];
        
        // Odayı oluştur
        const voiceChannel = await guild.channels.create({
            name: roomName,
            type: 2, // Voice Channel
            parent: categoryId,
            userLimit: userLimit,
            permissionOverwrites: channelPermissions,
            reason: `${user.tag} tarafından özel oda oluşturuldu`
        });
        
        // Oda ID'sini ve kullanıcı limiti veritabanına kaydet
        const roomId = voiceChannel.id;
        const createdAt = new Date();
        
        if (useMySQL) {
            // ISO datetime formatını MySQL formatına dönüştür
            const createdAtMySQLFormat = createdAt.toISOString().slice(0, 19).replace('T', ' ');
            
            await client.db.query(
                'INSERT INTO private_rooms (guild_id, channel_id, owner_id, room_name, user_limit, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [guildID, roomId, user.id, roomName, userLimit, createdAtMySQLFormat, 'active']
            );
        } else {
            const roomData = {
                channelId: roomId,
                ownerId: user.id,
                roomName: roomName,
                userLimit: userLimit,
                createdAt: createdAt.toISOString(),
                status: 'active'
            };
            
            // Odalar için veri yapısı var mı kontrol et
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            rooms[roomId] = roomData;
            await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
        }
        
        // Odanın kontrol panelini oluştur
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`private_room_add_${roomId}`)
                    .setLabel('Kullanıcı Ekle/Sil')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji(emoji.userPlus || '👥'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_limit_${roomId}`)
                    .setLabel('Oda Sınırı Ayarla')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji(emoji.gear || '⚙️'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_rename_${roomId}`)
                    .setLabel('Oda İsmini Değiştir')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(emoji.edit || '✏️'),
                    
                new ButtonBuilder()
                    .setCustomId(`private_room_close_${roomId}`)
                    .setLabel('Odayı Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji(emoji.trash || '🗑️')
            );
        
        // Odayı oluşturan kullanıcıya bilgi mesajı
        const embedColor = useMySQL ? settings.embed_color : settings.embedColor;
        
        const embed = new EmbedBuilder()
            .setTitle(`${emoji.door || '🚪'} Özel Odanız Oluşturuldu!`)
            .setDescription(`## ${roomName}\n\nOdanızı kontrol etmek için aşağıdaki butonları kullanabilirsiniz:
            
- **Kullanıcı Ekle/Sil**: Odanıza özel olarak kullanıcı ekleyin veya çıkarın
- **Oda Sınırı Ayarla**: Odanıza maksimum kaç kişi girebileceğini belirleyin
- **Oda İsmini Değiştir**: Odanızın ismini istediğiniz gibi değiştirin
- **Odayı Kapat**: Odanızı kalıcı olarak silin`)
            .setColor(embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea)
            .setFooter({
                text: `${guild.name} • Özel Oda Sistemi`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
        
        await interaction.reply({ 
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
        
        // Log kanalına bilgi mesajı
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send({
                embeds: [{
                    title: `${emoji.door || '🚪'} Yeni Özel Oda Oluşturuldu`,
                    description: `**Oda:** ${voiceChannel}\n**Sahibi:** ${user} (${user.tag})\n**Kullanıcı Limiti:** ${userLimit === 0 ? 'Limitsiz' : userLimit}`,
                    color: embedColor ? parseInt(embedColor.replace('#', ''), 16) : 0x5768ea,
                    footer: {
                        text: `Oda ID: ${roomId}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
    } catch (error) {
        console.error(global.hata(`Özel oda oluşturma işleme hatası: ${error}`));
        return interaction.reply({ 
            content: `❌ Özel oda oluşturulurken bir hata oluştu: ${error.message}`,
            ephemeral: true 
        });
    }
}

// Oda ismini değiştirme butonu işleme
async function handlePrivateRoomRename(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odanın sahibi siz değilsiniz!`, 
                ephemeral: true 
            });
        }
        
        // Modal oluştur
        const modal = new ModalBuilder()
            .setCustomId(`modal_private_room_rename_${roomId}`)
            .setTitle('Oda İsmini Değiştir');
            
        // İsim giriş alanı
        const nameInput = new TextInputBuilder()
            .setCustomId('room_name')
            .setLabel('Yeni Oda İsmi')
            .setPlaceholder('Odanızın yeni ismini girin')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(2)
            .setMaxLength(32);
            
        // Action row oluştur
        const firstRow = new ActionRowBuilder().addComponents(nameInput);
        
        // Modal'a action row'u ekle
        modal.addComponents(firstRow);
        
        // Modal'ı göster
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error(global.hata(`Özel oda isim değiştirme hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Oda ismi değiştirme modal işleme
async function handlePrivateRoomRenameModal(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const newRoomName = interaction.fields.getTextInputValue('room_name');
        
        // Kanalı kontrol et
        const channel = guild.channels.cache.get(roomId);
        if (!channel) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu kanal bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Oda ismini güncelle
        await channel.edit({
            name: newRoomName
        });
        
        // Veritabanı bilgilerini güncelle
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            await client.db.query(
                'UPDATE private_rooms SET room_name = ? WHERE guild_id = ? AND channel_id = ?',
                [newRoomName, guildID, roomId]
            );
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            if (rooms[roomId]) {
                rooms[roomId].roomName = newRoomName;
                await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
            }
        }
        
        return interaction.reply({ 
            content: `${emoji.done2 || '✅'} Özel odanızın ismi başarıyla "${newRoomName}" olarak değiştirildi!`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error(global.hata(`Özel oda isim değiştirme modal hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Odayı kapatma butonu işleme
async function handlePrivateRoomClose(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odayı kapatmak için oda sahibi veya yönetici olmanız gerekiyor!`, 
                ephemeral: true 
            });
        }
        
        // Kanalı kontrol et
        const channel = guild.channels.cache.get(roomId);
        if (!channel) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu kanal bulunamadı veya zaten silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Özel oda ayarlarını al
        let settings;
        if (useMySQL) {
            const result = await client.db.select('private_room_settings', { guild_id: guildID });
            settings = result && result.length > 0 ? result[0] : null;
        } else {
            settings = await localDBHandler.getData("private_room_settings", `privateRoom.${guildID}.settings`);
        }
        
        // Log kanalını bul
        let logChannel;
        if (settings) {
            const logChannelId = useMySQL ? settings.log_channel_id : settings.logChannelId;
            logChannel = guild.channels.cache.get(logChannelId);
        }
        
        // Veritabanı bilgilerini güncelle
        if (useMySQL) {
            // Instead of updating, delete the room entry completely from the database
            await client.db.query(
            'DELETE FROM private_rooms WHERE guild_id = ? AND channel_id = ?',
            [guildID, roomId]
            );
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            if (rooms[roomId]) {
            // Remove the room entry completely from the local database
            delete rooms[roomId];
            await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
            }
        }
        
        // Kullanıcıya bildir ve odayı kapat
        await interaction.reply({ 
            content: `${emoji.done2 || '✅'} Özel odanız kapatılıyor...`, 
            ephemeral: true 
        });
        
        // Log kanalına bilgi gönder
        if (logChannel) {
            const roomName = useMySQL ? roomData.room_name : roomData.roomName;
            
            await logChannel.send({
                embeds: [{
                    title: `${emoji.trash || '🗑️'} Özel Oda Kapatıldı`,
                    description: `**Oda:** ${channel.name}\n**Kapatan:** ${user} (${user.tag})\n**Oda Sahibi:** <@${ownerId}>`,
                    color: 0xED4245,
                    footer: {
                        text: `Oda ID: ${roomId}`,
                        icon_url: guild.iconURL({ dynamic: true })
                    },
                    timestamp: new Date()
                }]
            });
        }
        
        // Oda içindeki üyeleri çıkar
        if (channel.type === 2) { // Sesli kanal
            if (channel.members.size > 0) {
                channel.members.forEach(async (member) => {
                    try {
                        await member.voice.disconnect('Özel oda kapatıldı');
                    } catch (error) {
                        console.error(global.hata(`Üye kanaldan çıkarılırken hata: ${error}`));
                    }
                });
            }
        }
        
        // Kanalı sil
        setTimeout(async () => {
            try {
                await channel.delete(`Özel oda ${user.tag} tarafından kapatıldı`);
            } catch (error) {
                console.error(global.hata(`Özel oda silme hatası: ${error}`));
            }
        }, 2000);
    } catch (error) {
        console.error(global.hata(`Özel oda kapatma hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Özel odaya kullanıcı ekleme/silme modal işleme
async function handlePrivateRoomAddUserModal(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const targetUserId = interaction.fields.getTextInputValue('user_id');
        const action = interaction.fields.getTextInputValue('action').toLowerCase();
        
        // Kullanıcı ID kontrolü
        if (isNaN(targetUserId) || targetUserId.length < 17 || targetUserId.length > 19) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Geçersiz kullanıcı ID'si!`, 
                ephemeral: true 
            });
        }
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odanın sahibi siz değilsiniz!`, 
                ephemeral: true 
            });
        }
        
        // Kanalı kontrol et
        const channel = guild.channels.cache.get(roomId);
        if (!channel) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu kanal bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Hedef kullanıcıyı al
        const targetUser = await client.users.fetch(targetUserId).catch(() => null);
        if (!targetUser) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Kullanıcı bulunamadı!`, 
                ephemeral: true 
            });
        }
        
        // İşlem türüne göre ekle veya sil
        if (action === 'ekle') {
            await channel.permissionOverwrites.edit(targetUserId, { 
                ViewChannel: true, 
                Connect: true, 
                Speak: true 
            });
            
            return interaction.reply({ 
                content: `${emoji.done2 || '✅'} Kullanıcı başarıyla eklendi!`, 
                ephemeral: true 
            });
        } else if (action === 'sil') {
            await channel.permissionOverwrites.delete(targetUserId);
            
            return interaction.reply({ 
                content: `${emoji.done2 || '✅'} Kullanıcı başarıyla silindi!`, 
                ephemeral: true 
            });
        } else {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Geçersiz işlem! "ekle" veya "sil" yazmalısınız.`, 
                ephemeral: true 
            });
        }
        
    } catch (error) {
        console.error(global.hata(`Özel oda kullanıcı ekleme/silme modal hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}

// Oda sınırını ayarlama modal işleme
async function handlePrivateRoomLimitModal(interaction, roomId) {
    try {
        const { client, guild, user } = interaction;
        const guildID = guild.id;
        const embedHandler = require('../util/embedHandler')(client);
        const emoji = require('../util/emoji');
        const { database_type } = require('../config.json');
        const localDBHandler = require('../util/localDBHandler');
        
        // Form verilerini al
        const userLimit = parseInt(interaction.fields.getTextInputValue('user_limit'));
        
        // Limit kontrolü
        if (isNaN(userLimit) || userLimit < 0 || userLimit > 99) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Geçersiz kullanıcı limiti! 0 ile 99 arasında bir sayı girmelisiniz (0 = limitsiz).`, 
                ephemeral: true 
            });
        }
        
        // Oda bilgisini veritabanından al
        let roomData;
        const useMySQL = database_type === 'mysql' && client.db && client.db.isConnected;
        
        if (useMySQL) {
            const result = await client.db.select('private_rooms', { 
                guild_id: guildID, 
                channel_id: roomId,
                status: 'active'
            });
            roomData = result && result.length > 0 ? result[0] : null;
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            roomData = rooms[roomId];
        }
        
        if (!roomData) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu oda bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Kullanıcı oda sahibi mi kontrol et
        const ownerId = useMySQL ? roomData.owner_id : roomData.ownerId;
        
        if (user.id !== ownerId) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu odanın sahibi siz değilsiniz!`, 
                ephemeral: true 
            });
        }
        
        // Kanalı kontrol et
        const channel = guild.channels.cache.get(roomId);
        if (!channel) {
            return interaction.reply({ 
                content: `${emoji.closed || '❌'} Bu kanal bulunamadı veya silinmiş!`, 
                ephemeral: true 
            });
        }
        
        // Oda limitini güncelle
        await channel.edit({
            userLimit: userLimit
        });
        
        // Veritabanı bilgilerini güncelle
        if (useMySQL) {
            await client.db.query(
                'UPDATE private_rooms SET user_limit = ? WHERE guild_id = ? AND channel_id = ?',
                [userLimit, guildID, roomId]
            );
        } else {
            const rooms = await localDBHandler.getData("private_rooms", `privateRoom.${guildID}.rooms`) || {};
            if (rooms[roomId]) {
                rooms[roomId].userLimit = userLimit;
                await localDBHandler.insertData("private_rooms", `privateRoom.${guildID}.rooms`, rooms);
            }
        }
        
        return interaction.reply({ 
            content: `${emoji.done2 || '✅'} Oda kullanıcı limiti başarıyla ${userLimit === 0 ? 'limitsiz' : userLimit} olarak ayarlandı!`, 
            ephemeral: true 
        });
        
    } catch (error) {
        console.error(global.hata(`Özel oda sınırı ayarlama modal hatası: ${error}`));
        return interaction.reply({ 
            content: `${emoji.closed || '❌'} İşlem sırasında bir hata oluştu!`, 
            ephemeral: true 
        });
    }
}
