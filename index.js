const fs = require('node:fs');
const path = require('node:path');
const { 
    Client, 
    Collection, 
    GatewayIntentBits,
    Partials 
} = require('discord.js');
const { token, clientId, database, database_type,advanced_commands_in_cmd } = require('./config.json');
const chalk = require('chalk');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord.js');
const MySQLHandler = require('./util/mysqlHandler');
const emoji = require('./util/emoji');
const localDBHandler = require('./util/localDBHandler');
// DisTube için gerekli intent'leri ekliyoruz
const createDistubeClient = require('./util/distubeClient');

// Global renkli loglama yardımcıları tanımla
global.basarili = (text) => chalk.green(`[BAŞARILI] ${text}`);
global.bilgi = (text) => chalk.blue(`[BİLGİ] ${text}`);
global.hata = (text) => chalk.red(`[HATA] ${text}`);

// Create a new client instance with required intents for music
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates, // Müzik sistemi için gerekli intent
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]
});

// MySQL veritabanı bağlantısını kur - Öncelikle database objesi kontrol edilmeli
if (database && database_type === 'mysql') {
    // Veritabanı yapılandırmasını kontrol et
    if (database.host && database.user && database.database) {
        console.log(bilgi(`MySQL yapılandırması doğrulandı, bağlantı kuruluyor...`));
        client.db = new MySQLHandler(database);
    } else {
        console.log(hata("MySQL yapılandırması eksik veya hatalı. Yerel veritabanı kullanılacak."));
        client.db = null;
    }
} else {
    console.log(bilgi("MySQL yapılandırılmamış veya devre dışı. Yerel veritabanı kullanılacak."));
    client.db = null;
}

// Local DB'yi her durumda hazırla
client.localDB = localDBHandler;

// Chalk stillerini global olarak tanımla
global.basarili = basarili;
global.bilgi = bilgi;
global.hata = hata;

// Create commands collection
client.commands = new Collection();

// Load commands from categories
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const commands = [];

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());
            if(advanced_commands_in_cmd==false){
               console.log(bilgi(`${chalk.cyan(command.data.name)} komutu ${chalk.cyan(folder)} kategorisinden yüklendi`));
            }
        } else {
            console.log(hata(`${filePath} konumundaki komut dosyasında gerekli "data" veya "execute" özelliği eksik.`));
        }
    }
}

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    //console.log(bilgi(`${chalk.cyan(event.name)} eventi yüklendi`));
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(bilgi(`${commands.length} adet slash komut güncelleniyor...`));

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(basarili(`${chalk.cyan(data.length)} adet slash komut yenilendi.`));
    } catch (error) {
        console.error(hata(error));
    }
})();

// DisTube istemcisini oluştur
client.distube = createDistubeClient(client);
console.log(bilgi("DisTube müzik sistemi yüklendi."));

// Login to Discord with your client's token
client.login(token).then(async () => {
    // Veritabanı bağlantısını kur, eğer MySQL yapılandırılmışsa
    if (client.db) {
        try {
            console.log(bilgi("MySQL veritabanı bağlantısı kuruluyor..."));
            const connected = await client.db.connect();
            
            if (connected) {
                try {
                    await client.db.initializeDB();
                    console.log(basarili("MySQL veritabanı bağlantısı kuruldu ve tablolar oluşturuldu."));
                } catch (dbError) {
                    console.error(hata(`Tablo oluşturma hatası: ${dbError.message}`));
                }
            } else {
                console.log(hata("MySQL bağlantısı başarısız. Yerel veritabanı kullanılacak."));
                // Bağlantı kurulamadığında yerel DB'ye geç
                client.db = null;
            }
        } catch (err) {
            console.log(hata("Lütfen config.js dosyasından 'database_type' değerini 'local' veya 'mysql' olarak ayarlayın."));
            client.db = null;
        }
    }
    
    // MySQL bağlantısı kurulamazsa yerel DB'yi kullan
    if (!client.db) {
        console.log(bilgi("Yerel veritabanı kullanılıyor."));
        try {
            client.localDB.InitalizeDB();
            console.log(basarili("Yerel veritabanı başlatıldı."));
        } catch (err) {
            console.error(hata(`Yerel veritabanı başlatılırken hata: ${err}`));
        }
    }
}).catch((err) => {
    console.error(hata(`Bot Discord'a bağlanamadı: ${err}`));
});

// Uygulama kapatılırken veritabanı bağlantısını kapat
process.on('SIGINT', async () => {
    console.log(bilgi("Bot kapatılıyor..."));
    
    if (client.db && client.db.isConnected) {
        await client.db.disconnect();
    }
    
    process.exit(0);
});
