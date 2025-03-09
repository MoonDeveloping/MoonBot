const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { EmbedBuilder } = require('discord.js');
const emoji = require('./emoji');

/**
 * DIStuBe istemcisini oluşturur ve yapılandırır
 * @param {Client} client Discord.js istemcisi
 * @returns {DisTube} DIStuBe istemcisi
 */
function createDistubeClient(client) {
    const distube = new DisTube(client, {
        plugins: [
            new SpotifyPlugin({
                api: {
                    clientId: '',
                    clientSecret: '',
                },
            }),
            new SoundCloudPlugin(),
            new YtDlpPlugin({
                update: true
            })
        ],
    });

    // DisTube olayları
    distube
        .on("playSong", (queue, song) => {
            const embedHandler = require('./embedHandler')(client);
            
            // Make sure we have a valid text channel before sending messages
            if (!queue.textChannel || typeof queue.textChannel.send !== 'function') {
                console.error(global.hata("Queue text channel is not valid or send method not available"));
                return;
            }
            
            const embed = embedHandler.successEmbed(
                `${emoji.music || '🎵'} Şarkı Çalınıyor`,
                `**[${song.name}](${song.url})**\n` +
                `> **Süre:** \`${song.formattedDuration}\`\n` +
                `> **İsteyen:** ${song.user}\n` +
                `> **Ses Seviyesi:** \`${queue.volume}%\``
            ).setThumbnail(song.thumbnail);
            
            queue.textChannel.send({ embeds: [embed] }).catch(err => 
                console.error(global.hata(`Şarkı mesajı gönderilirken hata: ${err.message}`))
            );
        })
        .on("addSong", (queue, song) => {
            const embedHandler = require('./embedHandler')(client);
            
            // Make sure we have a valid text channel before sending messages
            if (!queue.textChannel || typeof queue.textChannel.send !== 'function') {
                console.error(global.hata("Queue text channel is not valid or send method not available"));
                return;
            }
            
            const embed = embedHandler.successEmbed(
                `${emoji.done2 || '➕'} Şarkı Eklendi`,
                `**[${song.name}](${song.url})**\n` +
                `> **Süre:** \`${song.formattedDuration}\`\n` +
                `> **İsteyen:** ${song.user}\n` +
                `> **Sırada:** \`${queue.songs.length}\` numaralı sırada`
            ).setThumbnail(song.thumbnail);
            
            queue.textChannel.send({ embeds: [embed] }).catch(err => 
                console.error(global.hata(`Şarkı ekleme mesajı gönderilirken hata: ${err.message}`))
            );
        })
        .on("addList", (queue, playlist) => {
            const embedHandler = require('./embedHandler')(client);
            
            // Make sure we have a valid text channel before sending messages
            if (!queue.textChannel || typeof queue.textChannel.send !== 'function') {
                console.error(global.hata("Queue text channel is not valid or send method not available"));
                return;
            }
            
            const embed = embedHandler.successEmbed(
                `${emoji.playlist || '📜'} Çalma Listesi Eklendi`,
                `**[${playlist.name}](${playlist.url})**\n` +
                `> **Şarkı Sayısı:** \`${playlist.songs.length}\`\n` +
                `> **Toplam Süre:** \`${playlist.formattedDuration}\`\n` +
                `> **İsteyen:** ${playlist.songs[0].user}`
            ).setThumbnail(playlist.thumbnail);
            
            queue.textChannel.send({ embeds: [embed] }).catch(err => 
                console.error(global.hata(`Playlist mesajı gönderilirken hata: ${err.message}`))
            );
        })
        .on("error", (channel, e) => {
            // Check if channel is valid before using it
            if (channel && typeof channel.send === 'function') {
                const embedHandler = require('./embedHandler')(client);
                
                // Improved error message extraction
                let errorMessage = "Bilinmeyen hata";
                if (e instanceof Error) {
                    errorMessage = e.message;
                } else if (typeof e === 'object') {
                    errorMessage = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
                } else if (typeof e === 'string') {
                    errorMessage = e;
                } else {
                    errorMessage = String(e);
                }
                
                // Limit error message length
                if (errorMessage.length > 1000) {
                    errorMessage = errorMessage.substring(0, 997) + '...';
                }
                
                const embed = embedHandler.errorEmbed(
                    `${emoji.close || '❌'} Müzik Hatası`,
                    `> \`Müzik çalarken bir hata oluştu.\`\n> \`${errorMessage}\``
                );
                
                channel.send({ embeds: [embed] }).catch(err => 
                    console.error(global.hata(`Hata mesajı gönderilirken hata: ${err.message}`))
                );
            }
            
            // Improved error logging
            if (e instanceof Error) {
                console.error(global.hata(`DisTube hatası: ${e.stack || e.message}`));
            } else if (typeof e === 'object') {
                console.error(global.hata(`DisTube hatası: ${JSON.stringify(e, null, 2)}`));
            } else {
                console.error(global.hata(`DisTube hatası: ${e}`));
            }
        })
        .on("empty", (queue) => {
            // Make sure we have a valid text channel before sending messages
            if (!queue.textChannel || typeof queue.textChannel.send !== 'function') {
                console.error(global.hata("Queue text channel is not valid or send method not available"));
                return;
            }
            
            const embedHandler = require('./embedHandler')(client);
            
            const embed = embedHandler.infoEmbed(
                `${emoji.info || 'ℹ️'} Kanal Boş`,
                `> \`Ses kanalında kimse kalmadı, çıkılıyor...\``
            );
            
            queue.textChannel.send({ embeds: [embed] }).catch(err => 
                console.error(global.hata(`Empty mesajı gönderilirken hata: ${err.message}`))
            );
        })
        .on("finish", (queue) => {
            // Make sure we have a valid text channel before sending messages
            if (!queue.textChannel || typeof queue.textChannel.send !== 'function') {
                console.error(global.hata("Queue text channel is not valid or send method not available"));
                return;
            }
            
            const embedHandler = require('./embedHandler')(client);
            
            const embed = embedHandler.infoEmbed(
                `${emoji.done || '✅'} Tamamlandı`,
                `> \`Tüm şarkılar çalındı.\``
            );
            
            queue.textChannel.send({ embeds: [embed] }).catch(err => 
                console.error(global.hata(`Finish mesajı gönderilirken hata: ${err.message}`))
            );
        })
        .on("disconnect", (queue) => {
            // Make sure we have a valid text channel before sending messages
            if (!queue.textChannel || typeof queue.textChannel.send !== 'function') {
                console.error(global.hata("Queue text channel is not valid or send method not available"));
                return;
            }
            
            const embedHandler = require('./embedHandler')(client);
            
            const embed = embedHandler.infoEmbed(
                `${emoji.leave || '👋'} Bağlantı Kesildi`,
                `> \`Ses kanalından ayrıldım.\``
            );
            
            queue.textChannel.send({ embeds: [embed] }).catch(err => 
                console.error(global.hata(`Disconnect mesajı gönderilirken hata: ${err.message}`))
            );
        })
        .on("initQueue", (queue) => {
            queue.volume = 100;
            queue.autoplay = false;
        });
        
    return distube;
}

module.exports = createDistubeClient;
