const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  return {
    /** 
     * Başarılı Embed Oluşturur
     * @param {string} title Başlık
     * @param {string} description Açıklama
     */
    successEmbed: (title, description) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#5768ea')
        .setTimestamp()
        .setFooter({ text: client.user.tag, iconURL: client.user.displayAvatarURL() });
    },

    /** 
     * Bilgi Embed Oluşturur
     * @param {string} title Başlık
     * @param {string} description Açıklama
     */
    infoEmbed: (title, description) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#5768ea')
        .setTimestamp()
        .setFooter({ text: client.user.tag, iconURL: client.user.displayAvatarURL() });
    },

    /** 
     * Hata Embed Oluşturur
     * @param {string} title Başlık
     * @param {string} description Açıklama
     */
    errorEmbed: (title, description) => {
      return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#c65b62')
        .setTimestamp()
        .setFooter({ text: client.user.tag, iconURL: client.user.displayAvatarURL() });
    }
  };
};
