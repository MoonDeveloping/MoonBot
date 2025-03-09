const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const basarili = (text) => chalk.green(`[BAŞARILI] ${text}`);
const bilgi = (text) => chalk.blue(`[BİLGİ] ${text}`);
const hata = (text) => chalk.red(`[HATA] ${text}`);

// emojiler.json dosyasını okuma
let emojiler = {};
try {
    const emojiFilePath = path.join(__dirname, '..', 'emojiler.json');
    const emojiData = fs.readFileSync(emojiFilePath, 'utf8');
    emojiler = JSON.parse(emojiData);
    
    // Yorum içeren anahtarları temizle
    Object.keys(emojiler).forEach(key => {
        if (key.includes('/*')) {
            delete emojiler[key];
        }
    });
    
        console.log(bilgi('Emoji Modülü Yüklendi'));
} catch (error) {
    console.log(hata('Emoji modülü yüklenirken hata oluştu' + error));	
    // Hata durumunda boş bir obje ile devam et
}

/**
 * Emoji isminden emojinin kendisini döndürür
 * @param {string} name - Emoji adı
 * @returns {string} Emoji veya boş string
 */
function getEmoji(name) {
    return emojiler[name] || '';
}

/**
 * Tüm emojileri döndürür
 * @returns {Object} Emoji objesi
 */
function getAllEmojis() {
    return { ...emojiler };
}

module.exports = {
    getEmoji,
    getAllEmojis,
    ...emojiler  // Doğrudan erişim için tüm emojileri dışa aktar
}; 