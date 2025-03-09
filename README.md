# MoonBot Discord Botu

MoonBot, Discord.js ile geliştirilmiş, moderasyondan müzik çalmaya ve eğlence komutlarına kadar geniş bir işlevsellik yelpazesine sahip kapsamlı bir Discord botudur. **Son resmi versiyonu değildir başka özellikler eklenecektir**

## İçindekiler
- [Proje Yapısı]
- [Komut Sistemi]
- [Olay Sistemi]
- [İşleyici Sistemleri]
  - [Embed İşleyici]
  - [Emoji İşleyici]
  - [LocalDB İşleyici]
- [Veritabanı Sistemleri]
  - [LocalDB]
  - [MySQL Entegrasyonu]
- [Özellikler]
  - [Moderasyon Sistemleri]
  - [Müzik Sistemi]
  - [Kullanıcı Yönetimi]
  - [Bilet Sistemi]
  - [Özel Oda Sistemi]
  - [Otomasyon Sistemleri]

## Komut Sistemi

Bot, Discord'un slash komut sistemini kullanır. Tüm komutlar `commands/` klasöründeki kategorilere göre düzenlenmiştir:
- **admin**: Sunucu yönetimi ve moderasyon komutları
- **kullanıcı**: Genel kullanıcı komutları
- **müzik**: Müzik çalma ve kontrol komutları
- **sistem**: Bot yapılandırma ve sistem komutları

## Olay Sistemi

Bot, Discord olaylarını dinlemek ve işlemek için tasarlanmış özel işleyicilere sahiptir. Tüm olay işleyicileri `events/` klasöründe bulunur.

## İşleyici Sistemleri

### Embed İşleyici
Tutarlı bir görsel arayüz için merkezi bir embed oluşturma sistemi.

### Emoji İşleyici
Bot genelinde özel emoji yönetimi için tasarlanmıştır. `emojiler.json` dosyası özel emoji ID'lerini ve erişim kodlarını içerir.

### LocalDB İşleyici
Yerel veritabanı işlemleri için kullanılan sistem.

## Veritabanı Sistemleri

### LocalDB
Basit veriler için hızlı ve yerel JSON tabanlı veritabanı çözümü.

### MySQL Entegrasyonu
Daha karmaşık veri yapıları ve kalıcı depolama için MySQL veritabanı entegrasyonu.

## Özellikler

### Moderasyon Sistemleri
Sunucu yönetimi ve moderasyon için gerekli komut ve araçlar.

### Müzik Sistemi
DisTube kütüphanesi ile entegre edilmiş kapsamlı müzik çalma sistemi:
- Şarkı çalma ve sıralama
- Ses filtreleri ve kontroller
- Oynatma listesi yönetimi

### Bilet Sistemi
Kullanıcıların destek talepleri oluşturabileceği ve yöneticilerin yanıtlayabileceği bilet sistemi.

### Özel Oda Sistemi
Kullanıcıların kendi sesli ve metin kanallarını oluşturabileceği özel oda sistemi.
