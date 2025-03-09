const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { advanced_commands_in_cmd } = require('../config.json');
module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(global.basarili(`${chalk.cyan(client.user.tag)} olarak giriş yapıldı`));
        
        // Komutları listele
        await displayCommandList(client);

        client.user.setActivity('🌙 https://github.com/MoonDeveloping/MoonBot/tree/main');

    },
};

// Komut listesini gösteren fonksiyon
async function displayCommandList(client) {
    try {
        const foldersPath = path.join(__dirname, '..', 'commands');
        const commandFolders = fs.readdirSync(foldersPath);
        
        // Tüm komutları kategorilere göre grupla
        const commandsByCategory = {};
        
        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            
            commandsByCategory[folder] = commandFiles.map(file => {
                // Her komut dosyasından komut adını çıkar (dosya uzantısını at)
                return file.replace('.js', '');
            });
        }
        
        // Kutu içeriğini oluştur
        let boxContent = chalk.bold(chalk.blue('🌙 MOONBOT KOMUTLARI\n'));
        
        // Kategori adlarını özelleştir
        const categoryNames = {
            'admin': 'Admin',
            'kullanıcı': 'Kullanıcı',
            'sistem': 'Sistem',
            'müzik': 'Müzik'
        };
        
        // Her kategorinin komutlarını ekle
        for (const category in commandsByCategory) {
            const commands = commandsByCategory[category];
            const displayName = categoryNames[category] || `📁 ${category}`;
            
            boxContent += chalk.yellow(`\n${displayName} (${commands.length}):\n`);
            
            // Komutları 3 sütunlu bir düzende listele
            const columnWidth = 20;
            let line = '';  
            
            for (let i = 0; i < commands.length; i++) {
                const command = commands[i];
                let formattedCommand = `/${command}`;
                
                if (formattedCommand.length > columnWidth - 2) {
                    formattedCommand = formattedCommand.substring(0, columnWidth - 5) + '...';
                }
                
                line += formattedCommand.padEnd(columnWidth);
                
                // Her 3 komuttan sonra yeni satır ekle
                if ((i + 1) % 3 === 0 || i === commands.length - 1) {
                    boxContent += `${chalk.green(line)}\n`;
                    line = '';
                }
            }
        }
        
        // Toplam komut sayısını hesapla
        const totalCommands = Object.values(commandsByCategory).reduce((sum, commands) => sum + commands.length, 0);
        const totalCategories = Object.keys(commandsByCategory).length;
        boxContent += `\n${chalk.cyan('Toplam:')} ${chalk.bold(chalk.green(`${totalCommands} komut`))} ${chalk.cyan(`(${totalCategories} kategori)`)}`;
        
        try {
            // Boxen'i dinamik olarak import et
            const boxenModule = await import('boxen');
            const boxen = boxenModule.default;
            
            // Kutuyu oluştur ve konsola yazdır
            const box = boxen(boxContent, {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'blue',
                backgroundColor: '#000'
            });
            if(advanced_commands_in_cmd==true){
                console.log(box);
            }
            else return;       
        } catch (boxenError) {
            // Eğer boxen modülü yoksa daha basit bir format kullan
            console.log('\n' + boxContent + '\n');
            console.log(global.bilgi('Daha güzel bir görünüm için "boxen" paketini yükleyebilirsiniz: npm install boxen'));
        }
    } catch (error) {
        console.error(global.hata(`Komut listesi görüntülenirken hata oluştu: ${error}`));
    }
}
