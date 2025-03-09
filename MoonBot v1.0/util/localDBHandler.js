const path = require("path");
const fs = require("fs");

class LocalDBHandler {
    constructor() {
        this.databasePath = path.join(process.cwd(), "databases");

        if (!fs.existsSync(this.databasePath)) {
            fs.mkdirSync(this.databasePath, { recursive: true });
        }
    }

    createDB(name) {
        const dbFilePath = path.join(this.databasePath, `${name}.json`);
        if (!fs.existsSync(dbFilePath)) {
            fs.writeFileSync(dbFilePath, JSON.stringify({}, null, 4));
        }
    }

    getDBFilePath(name) {
        return path.join(this.databasePath, `${name}.json`);
    }

    insertData(dbName, key, value) {
        try {
            this.createDB(dbName); // Dosya yoksa oluştur

            const dbFilePath = this.getDBFilePath(dbName);
            let dbData = {};

            // Eğer dosya içinde veri varsa oku
            if (fs.existsSync(dbFilePath)) {
                const fileContent = fs.readFileSync(dbFilePath, "utf-8");
                if (fileContent) {
                    dbData = JSON.parse(fileContent);
                }
            }

            // Yeni veriyi ekle
            dbData[key] = value;

            // Güncellenmiş veriyi dosyaya yaz
            fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 4));

            return true;
        } catch (error) {
            console.error(`Error inserting data: ${error}`);
            return false;
        }
    }

    checkIfDBExists(name) {
        return fs.existsSync(this.getDBFilePath(name));
    }

    getData(dbName, key) {
        try {
            const dbFilePath = this.getDBFilePath(dbName);

            if (!fs.existsSync(dbFilePath)) {
                return null; // Dosya yoksa null döndür
            }

            const fileContent = fs.readFileSync(dbFilePath, "utf-8");
            if (!fileContent) return null;

            const dbData = JSON.parse(fileContent);
            return dbData[key] || null;
        } catch (error) {
            console.error(`Error retrieving data: ${error}`);
            return null;
        }
    }

    deleteData(dbName,key){
        try {
            const dbFilePath = this.getDBFilePath(dbName);

            if (!fs.existsSync(dbFilePath)) {
                return false; // Dosya yoksa false döndür
            }

            const fileContent = fs.readFileSync(dbFilePath, "utf-8");
            if (!fileContent) return false;

            const dbData = JSON.parse(fileContent);
            delete dbData[key];

            fs.writeFileSync(dbFilePath, JSON.stringify(dbData, null, 4));
            return true;
        } catch (error) {
            console.error(`Error deleting data: ${error}`);
            return false;
        }
    }

    getAllData(dbName) {
        try {
            const dbFilePath = this.getDBFilePath(dbName);

            if (!fs.existsSync(dbFilePath)) {
                return {}; 
            }

            const fileContent = fs.readFileSync(dbFilePath, "utf-8");
            if (!fileContent) return {};

            return JSON.parse(fileContent);
        } catch (error) {
            console.error(`Error retrieving all data: ${error}`);
            return {};
        }
    }

    // Ticket sistemi için yardımcı metodlar
    createTicket(guildId, userId, channelId) {
        const ticketKey = `${guildId}_${userId}`;
        const ticketData = {
            userId,
            channelId,
            createdAt: Date.now(),
            status: 'open'
        };
        return this.insertData('tickets', ticketKey, ticketData);
    }

    closeTicket(guildId, userId) {
        const ticketKey = `${guildId}_${userId}`;
        const ticketData = this.getData('tickets', ticketKey);
        if (ticketData) {
            ticketData.status = 'closed';
            ticketData.closedAt = Date.now();
            return this.insertData('tickets', ticketKey, ticketData);
        }
        return false;
    }

    getTicket(guildId, userId) {
        const ticketKey = `${guildId}_${userId}`;
        return this.getData('tickets', ticketKey);
    }

    getActiveTickets(guildId) {
        const allTickets = this.getAllData('tickets');
        const activeTickets = {};
        
        for (const [key, ticket] of Object.entries(allTickets)) {
            if (key.startsWith(guildId) && ticket.status === 'open') {
                activeTickets[key] = ticket;
            }
        }
        
        return activeTickets;
    }

    InitalizeDB(){
        this.createDB("otorol_rol");
        this.createDB("otorol_kanal");
        this.createDB("otorol_mesaj"); 
        this.createDB("hgbb_kanal");  
        this.createDB("hgbb_mesaj"); 
        this.createDB("sayac_kanal");  
        this.createDB("sayac_mesaj");
        this.createDB("modlog_kanal");
        this.createDB("modlog_ayarlar");
        this.createDB("register_settings");
        this.createDB("otocevap"); 
        this.createDB("counting_game");
        this.createDB("tickets");               
        this.createDB("ticket_settings");     
        this.createDB("private_room_settings");
        this.createDB("private_rooms");
    }
}

module.exports = new LocalDBHandler();
