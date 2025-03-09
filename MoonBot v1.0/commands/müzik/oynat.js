const { SlashCommandBuilder, InteractionResponse } = require('discord.js');
const emoji = require('../../util/emoji');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oynat')
        .setDescription('YouTube\'dan müzik çalar')
        .addStringOption(option => 
            option.setName('şarkı')
                .setDescription('Şarkı adı veya YouTube URL\'si')
                .setRequired(true)),
                
    async execute(interaction) {
        try {
            const { options, client, member, guild, channel } = interaction;
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
            
            // Bot için izinler kontrol et
            const permissions = voiceChannel.permissionsFor(guild.members.me);
            if (!permissions.has('Connect') || !permissions.has('Speak')) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Ses kanalına bağlanma veya konuşma iznim yok!\``
                );
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            // Şarkıyı al
            const query = options.getString('şarkı');
            
            // URL kontrolü yap
            const isYouTubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)/.test(query);
            const isSpotifyUrl = /^(https?:\/\/)?(open\.)?spotify\.com/.test(query);
            const isSoundCloudUrl = /^(https?:\/\/)?(www\.)?soundcloud\.com/.test(query);
            
            // Spotify veya SoundCloud URL'si ise uyarı ver
            if (isSpotifyUrl) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Desteklenmeyen Platform:`,
                    `> \`Spotify linkleri şu an desteklenmemektedir. Lütfen YouTube linki veya şarkı adı girin.\``
                );
                return interaction.reply({ embeds: [embed]});
            }
            
            if (isSoundCloudUrl) {
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Desteklenmeyen Platform:`,
                    `> \`SoundCloud linkleri şu an desteklenmemektedir. Lütfen YouTube linki veya şarkı adı girin.\``
                );
                return interaction.reply({ embeds: [embed]});
            }
            
            // İşlem yapılıyor mesajı
            await interaction.deferReply();
            
            try {
                // Kullanıcıya bilgi mesajı göster
                await interaction.editReply({
                    content: `${emoji.search || '🔍'} **${query}** aranıyor ve çalma listesine ekleniyor...`
                });
                
                // Şarkıyı çal
                await client.distube.play(voiceChannel, query, {
                    member: member,
                    textChannel: channel
                });
                
                // Eğer bu noktaya geldiysek, başarılı bir şekilde şarkı kuyruğa eklenmiştir
                // Distube olayları otomatik olarak bildirimleri gösterecektir
            } catch (error) {
                console.error(global.hata(`Oynat komutu hatası: ${error.message}`));
                
                const embed = embedHandler.errorEmbed(
                    `> ${emoji.close || '❌'} Hata:`,
                    `> \`Şarkı oynatılırken bir hata oluştu: ${error.message}\``
                );
                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(global.hata(`Oynat komutu hatası: ${error}`));
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: `${emoji.close || '❌'} Bir hata oluştu: ${error.message}` 
                });
            } else {
                await interaction.reply({ 
                    content: `${emoji.close || '❌'} Bir hata oluştu: ${error.message}`, 
                    ephemeral: true 
                });
            }
        }
    },
};
