const mysql = require('mysql2/promise');
const chalk = require('chalk');

/**
 * MySQL veritabanı işlemleri için handler sınıfı
 */
class MySQLHandler {
  /**
   * MySQL handler sınıfını başlatır
   * @param {Object} config - MySQL bağlantı yapılandırması
   * @param {string} config.host - MySQL sunucu adresi
   * @param {number} config.port - MySQL sunucu portu
   * @param {string} config.user - MySQL kullanıcı adı
   * @param {string} config.password - MySQL şifresi
   * @param {string} config.database - MySQL veritabanı adı
   */
  constructor(config) {
    // Config parametresinin doğruluğunu kontrol et
    if (!config || !config.host) {
      console.error(global.hata('Geçersiz MySQL yapılandırması'));
      this.config = null;
    } else {
      this.config = config;
    }
    
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * MySQL veritabanına bağlanır
   */
  async connect() {
    try {
      // Config kontrolü
      if (!this.config) {
        console.error(global.hata('Geçersiz MySQL yapılandırması, bağlantı kurulamıyor.'));
        return false;
      }
      
      // Bağlantı havuzu oluştur
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port || 3306,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test bağlantısı ile bağlantıyı kontrol et
      const connection = await this.pool.getConnection();
      connection.release();
      
      this.isConnected = true;
      console.log(global.basarili(`MySQL veritabanına başarıyla bağlanıldı: ${chalk.cyan(this.config.database)}`));
      return true;
    } catch (err) {
      console.error(global.hata(`MySQL bağlantısında hata: ${err.message}`));
      this.pool = null;
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Veritabanı bağlantısını kapatır
   */
  async disconnect() {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isConnected = false;
        console.log(global.bilgi(`MySQL veritabanı bağlantısı kapatıldı: ${chalk.cyan(this.config.database)}`));
      } catch (err) {
        console.error(global.hata(`Bağlantı kapatılırken hata: ${err.message}`));
      }
    }
  }

  /**
   * SQL sorgusu çalıştırır
   * @param {string} sql - SQL sorgu metni
   * @param {Array} params - Sorgu parametreleri
   * @returns {Promise<Array>} - Sorgu sonuçları
   */
  async query(sql, params = []) {
    try {
      // Bağlantı yoksa yeniden bağlanmayı dene
      if (!this.isConnected || !this.pool) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Veritabanı bağlantısı kurulamadı');
        }
      }

      // Pool null kontrolü
      if (!this.pool) {
        throw new Error('Veritabanı bağlantısı başarısız');
      }

      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (err) {
      console.error(global.hata(`SQL sorgusu çalıştırılırken hata: ${err.message}`));
      console.error(global.hata(`Sorgu: ${sql}`));
      console.error(global.hata(`Parametreler: ${JSON.stringify(params)}`));
      throw err;
    }
  }

  /**
   * Belirtilen tablodan veri seçer
   * @param {string} table - Tablo adı
   * @param {Object} conditions - Koşullar (WHERE için)
   * @param {Array} fields - Seçilecek alanlar (varsayılan: tüm alanlar)
   * @param {Object} options - Ek seçenekler (limit, order by, vb.)
   * @returns {Promise<Array>} - Seçilen veriler
   */
  async select(table, conditions = {}, fields = ['*'], options = {}) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    let sql = `SELECT ${fields.join(', ')} FROM ${table}`;
    
    if (keys.length > 0) {
      sql += ' WHERE ' + keys.map(key => `${key} = ?`).join(' AND ');
    }
    
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
      
      if (options.order) {
        sql += ` ${options.order}`;
      }
    }
    
    if (options.limit) {
      sql += ` LIMIT ${options.limit}`;
      
      if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
      }
    }
    
    return await this.query(sql, values);
  }

  /**
   * Belirtilen tabloya veri ekler
   * @param {string} table - Tablo adı
   * @param {Object} data - Eklenecek veri
   * @returns {Promise<Object>} - Ekleme sonucu
   */
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
    
    return await this.query(sql, values);
  }

  /**
   * Belirtilen tablodaki veriyi günceller
   * @param {string} table - Tablo adı
   * @param {Object} data - Güncellenecek veri
   * @param {Object} conditions - Koşullar (WHERE için)
   * @returns {Promise<Object>} - Güncelleme sonucu
   */
  async update(table, data, conditions) {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    
    const conditionKeys = Object.keys(conditions);
    const conditionValues = Object.values(conditions);
    
    const sql = `UPDATE ${table} SET ${dataKeys.map(key => `${key} = ?`).join(', ')} WHERE ${conditionKeys.map(key => `${key} = ?`).join(' AND ')}`;
    
    return await this.query(sql, [...dataValues, ...conditionValues]);
  }

  /**
   * Belirtilen tablodaki veriyi siler
   * @param {string} table - Tablo adı
   * @param {Object} conditions - Koşullar (WHERE için)
   * @returns {Promise<Object>} - Silme sonucu
   */
  async delete(table, conditions) {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    
    const sql = `DELETE FROM ${table} WHERE ${keys.map(key => `${key} = ?`).join(' AND ')}`;
    
    return await this.query(sql, values);
  }

  /**
   * Çoklu veri eklemek için
   * @param {string} table - Tablo adı
   * @param {Array<Object>} dataArray - Eklenecek veri dizisi
   * @returns {Promise<Object>} - Ekleme sonucu
   */
  async insertMany(table, dataArray) {
    if (!dataArray.length) {
      return { affectedRows: 0 };
    }
    
    const keys = Object.keys(dataArray[0]);
    const placeholders = dataArray.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
    const values = dataArray.flatMap(data => Object.values(data));
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholders}`;
    
    return await this.query(sql, values);
  }

  /**
   * Tablonun varlığını kontrol eder
   * @param {string} tableName - Tablo adı
   * @returns {Promise<boolean>} - Tablo varsa true, yoksa false
   */
  async tableExists(tableName) {
    try {
      const result = await this.query(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [this.config.database, tableName]
      );
      
      return result[0].count > 0;
    } catch (err) {
      console.error(global.hata(`Tablo kontrolünde hata: ${err.message}`));
      return false;
    }
  }

  /**
   * Veritabanını başlatır ve gerekli tabloları oluşturur
   * @returns {Promise<boolean>} - Başarılıysa true, değilse false
   */
  async initializeDB() {
    try {
      if (!this.isConnected || !this.pool) {
        const connected = await this.connect();
        if (!connected) {
          return false;
        }
      }
      
      await this.query(`
          CREATE TABLE IF NOT EXISTS autoroles (
              guild_id VARCHAR(255) NOT NULL,
              role_id VARCHAR(255) NOT NULL,
              channel_id VARCHAR(255) NOT NULL,
              welcome_message TEXT NOT NULL,
              embed_color VARCHAR(7) NOT NULL DEFAULT '#00ff00',
              PRIMARY KEY (guild_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await this.query(`
        CREATE TABLE IF NOT EXISTS welcome_leave (
            guild_id VARCHAR(255) NOT NULL,
            channel_id VARCHAR(255) NOT NULL,
                welcome_message TEXT NOT NULL,
                leave_message TEXT NOT NULL,
                welcome_color VARCHAR(7) NOT NULL DEFAULT '#00ff00',
                leave_color VARCHAR(7) NOT NULL DEFAULT '#ff0000',
            PRIMARY KEY (guild_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await this.query(`
        CREATE TABLE IF NOT EXISTS counter (
        guild_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
            target_count INT NOT NULL,
            join_message TEXT NOT NULL,
            leave_message TEXT NOT NULL,
            join_color VARCHAR(7) NOT NULL DEFAULT '#00ff00',
            leave_color VARCHAR(7) NOT NULL DEFAULT '#ff0000',
        PRIMARY KEY (guild_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
    CREATE TABLE IF NOT EXISTS modlog (
        guild_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,       
        message_delete TINYINT(1) DEFAULT 0,
        message_edit TINYINT(1) DEFAULT 0,
        channel_create TINYINT(1) DEFAULT 0,
        channel_delete TINYINT(1) DEFAULT 0,
        role_create TINYINT(1) DEFAULT 0,
        role_delete TINYINT(1) DEFAULT 0,
        PRIMARY KEY (guild_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);
      
await this.query(`
    CREATE TABLE IF NOT EXISTS register_settings (
        guild_id VARCHAR(255) NOT NULL,
        staff_role_id VARCHAR(255) NOT NULL,
        log_channel_id VARCHAR(255) NOT NULL,
        register_channel_id VARCHAR(255) NOT NULL,
        member_role_id VARCHAR(255) NOT NULL,
        male_role_id VARCHAR(255),
        female_role_id VARCHAR(255),
    PRIMARY KEY (guild_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
    CREATE TABLE IF NOT EXISTS auto_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(255) NOT NULL,
        trigger_text VARCHAR(255) NOT NULL,
        response_text TEXT NOT NULL,
        use_embed TINYINT(1) DEFAULT 0,
        embed_color VARCHAR(7) DEFAULT '#5768ea'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
  CREATE TABLE IF NOT EXISTS counting_game (
      guild_id VARCHAR(255) NOT NULL,
      channel_id VARCHAR(255) NOT NULL,
      current_number INT NOT NULL DEFAULT 0,
      last_user_id VARCHAR(255),
      PRIMARY KEY (guild_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
    CREATE TABLE IF NOT EXISTS ticket_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        category_id VARCHAR(20) NOT NULL,
        staff_role_id VARCHAR(20) NOT NULL,
        log_channel_id VARCHAR(20) NOT NULL,
        panel_message_id VARCHAR(20),
        panel_channel_id VARCHAR(20),
        welcome_message TEXT,
        embed_color VARCHAR(10) DEFAULT '#5768ea'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
    CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        channel_id VARCHAR(20) NOT NULL,
        user_id VARCHAR(20) NOT NULL,
        ticket_number INT NOT NULL,
        created_at DATETIME NOT NULL,
        status ENUM('open', 'closed', 'deleted') DEFAULT 'open',
        closed_by VARCHAR(20),
        closed_at DATETIME,
        deleted_by VARCHAR(20),
        deleted_at DATETIME,
        UNIQUE KEY unique_ticket (guild_id, channel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
    CREATE TABLE IF NOT EXISTS private_room_settings (
        guild_id VARCHAR(20) PRIMARY KEY,
        category_id VARCHAR(20) NOT NULL,
        log_channel_id VARCHAR(20) NOT NULL,
        max_rooms_per_user TINYINT UNSIGNED DEFAULT 1,
        panel_message_id VARCHAR(20),
        panel_channel_id VARCHAR(20),
        embed_color VARCHAR(10) DEFAULT '#5768ea'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

await this.query(`
    CREATE TABLE IF NOT EXISTS private_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        guild_id VARCHAR(20) NOT NULL,
        channel_id VARCHAR(20) NOT NULL,
        owner_id VARCHAR(20) NOT NULL,
        room_name VARCHAR(100) NOT NULL,
        user_limit INT DEFAULT 0,
        created_at DATETIME NOT NULL,
        status ENUM('active', 'closed') DEFAULT 'active',
        closed_by VARCHAR(20),
        closed_at DATETIME,
        UNIQUE KEY unique_room (guild_id, channel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`);

      console.log(global.basarili(`Veritabanı başarıyla başlatıldı ve tablolar oluşturuldu`));
      return true;
    } catch (err) {
      console.error(global.hata(`Veritabanı başlatılırken hata: ${err.message}`));
      return false;
    }
  }

  /**
   * SQL dosyasını çalıştırır
   * @param {string} filePath - SQL dosyasının yolu
   * @returns {Promise<boolean>} - Başarılıysa true, değilse false
   */
  async executeSQLFile(filePath) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      const fullPath = path.resolve(filePath);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const queries = fileContent.split(';').filter(query => query.trim() !== '');
      
      for (const query of queries) {
        await this.query(query);
      }
      
      console.log(global.basarili(`SQL dosyası başarıyla çalıştırıldı: ${chalk.cyan(filePath)}`));
      return true;
    } catch (err) {
      console.error(global.hata(`SQL dosyası çalıştırılırken hata: ${err.message}`));
      return false;
    }
  }
}

module.exports = MySQLHandler;
