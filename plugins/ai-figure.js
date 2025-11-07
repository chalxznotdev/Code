import axios from 'axios';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

// Hanya menyisakan 3 fitur figure
const availableEndpoints = {
  '1': {
    url: 'https://api-faa.my.id/faa/tofigura?url=',
    name: 'Figura Style V1',
    description: 'Efek figura versi 1 - Classic Style'
  },
  '2': {
    url: 'https://api-faa.my.id/faa/tofigurav2?url=',
    name: 'Figura Style V2',
    description: 'Efek figura versi 2 - Enhanced Style'
  },
  '3': {
    url: 'https://api-faa.my.id/faa/tofigurav3?url=',
    name: 'Figura Style V3',
    description: 'Efek figura versi 3 - Premium Style'
  }
};

let handler = async (m, { conn, usedPrefix, command, args }) => {
  try {
    // Jika tidak ada argumen, tampilkan daftar fitur figure
    if (!args[0]) {
      let featureList = '🎨 *Fitur Figure Image Converter*\n\n';
      
      Object.keys(availableEndpoints).forEach((key, index) => {
        const endpoint = availableEndpoints[key];
        featureList += `${index + 1}. *${key}* - ${endpoint.name}\n   ▸ ${endpoint.description}\n\n`;
      });
      
      featureList += `📝 *Cara Penggunaan:*\n${usedPrefix + command} <nama_fitur>\n\n`;
      featureList += `💡 *Contoh:*\n${usedPrefix + command} 1\n${usedPrefix + command} 2\n${usedPrefix + command} 3`;
      
      return m.reply(featureList);
    }

    const feature = args[0].toLowerCase();
    
    // Validasi fitur
    if (!availableEndpoints[feature]) {
      let errorMsg = `❌ Fitur "${feature}" tidak ditemukan!\n\n`;
      errorMsg += `📋 *Fitur yang tersedia:*\n`;
      
      Object.keys(availableEndpoints).forEach(key => {
        errorMsg += `• ${key} - ${availableEndpoints[key].name}\n`;
      });
      
      errorMsg += `\nGunakan *${usedPrefix + command}* tanpa argumen untuk melihat semua fitur.`;
      
      return m.reply(errorMsg);
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    // Ambil media dari pesan
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || '';
    
    if (!mime || mime === 'conversation') {
      return m.reply(`📸 Silakan reply gambar dengan caption *${usedPrefix + command} ${feature}*`);
    }

    if (!mime.startsWith('image/')) {
      return m.reply(`❌ Hanya gambar yang didukung! Format ${mime} tidak valid.`);
    }

    await m.reply(`🔄 *Memproses gambar...*\n▸ Fitur: ${availableEndpoints[feature].name}\n▸ Status: Mengunduh gambar...`);

    let media = await q.download();
    if (!media || media.length === 0) return m.reply('❌ Gagal mendownload media');

    // Validasi ukuran file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (media.length > maxSize) {
      return m.reply(`❌ Ukuran gambar terlalu besar! Maksimal 10MB. Ukuran saat ini: ${(media.length / 1024 / 1024).toFixed(2)}MB`);
    }

    let fileType = await fileTypeFromBuffer(media);
    let ext = fileType?.ext || 'jpg';

    // ===== Upload ke Catbox =====
    await m.reply('☁️ *Mengunggah gambar ke server...*');
    
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', media, { filename: `figure_${Date.now()}.${ext}`, contentType: mime });

    let uploadRes;
    try {
      uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
          ...form.getHeaders(),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxBodyLength: Infinity,
        timeout: 60000
      });
    } catch (err) {
      console.error('Upload gagal:', err);
      throw new Error('❌ Gagal mengunggah gambar ke server');
    }

    // Validasi URL upload
    let urlFile = uploadRes.data.trim();
    if (!urlFile.startsWith('http')) {
      throw new Error(`❌ Respon upload tidak valid: ${urlFile}`);
    }

    await m.reply('🎨 *Mengaplikasikan efek figura...*\nIni mungkin membutuhkan waktu 10-30 detik.');

    const endpoint = availableEndpoints[feature];
    const apiUrl = `${endpoint.url}${encodeURIComponent(urlFile)}`;

    const figureRes = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const buffer = Buffer.from(figureRes.data);

    // Validasi buffer hasil
    if (!buffer || buffer.length === 0) {
      throw new Error('❌ Hasil konversi kosong atau gagal');
    }

    // Validasi tipe file hasil
    const resultFileType = await fileTypeFromBuffer(buffer);
    if (!resultFileType || !resultFileType.mime.startsWith('image/')) {
      throw new Error('❌ Hasil konversi bukan gambar yang valid');
    }

    // ===== KIRIM HASIL DALAM FORMAT SLIDE =====
    
    // 1. Kirim gambar asli sebagai slide pertama
    await conn.sendMessage(m.chat, {
      image: media,
      caption: `🖼️ *Gambar Asli*\n▸ Ukuran: ${formatBytes(media.length)}\n▸ Format: ${ext.toUpperCase()}`
    }, { quoted: m });

    // 2. Kirim gambar hasil sebagai slide kedua
    await conn.sendMessage(m.chat, {
      image: buffer,
      caption: `✅ *Hasil Konversi - ${endpoint.name}*\n\n` +
              `▸ *Fitur:* ${endpoint.name}\n` +
              `▸ *Deskripsi:* ${endpoint.description}\n` +
              `▸ *Ukuran Hasil:* ${formatBytes(buffer.length)}\n` +
              `▸ *Format:* ${resultFileType.ext.toUpperCase()}\n` +
              `▸ *Status:* Berhasil ✨\n\n` +
              `✨ *Powered by ZERO - AI Assistant*`
    });

    // 3. Kirim informasi tambahan sebagai slide ketiga
    await conn.sendMessage(m.chat, {
      text: `📊 *Informasi Proses Figura*\n\n` +
            `✅ *Konversi Selesai!*\n\n` +
            `▸ *Fitur Terpakai:* ${endpoint.name}\n` +
            `▸ *Versi:* ${feature.replace('figure', 'V')}\n` +
            `▸ *Reduksi Ukuran:* ${((1 - buffer.length/media.length) * 100).toFixed(1)}%\n` +
            `▸ *Kualitas:* ${buffer.length > media.length ? 'Enhanced' : 'Optimized'}\n\n` +
            `💡 *Tips:* Gunakan fitur lain:\n` +
            `• ${usedPrefix + command} 1\n` +
            `• ${usedPrefix + command} 2\n` +
            `• ${usedPrefix + command} 3\n\n`
    });

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (err) {
    console.error('Error:', err);
    
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    
    let errorMessage = '❌ *Gagal memproses gambar!*\n\n';
    
    if (err.message.includes('timeout')) {
      errorMessage += '⏱️ *Timeout:* Proses terlalu lama.\n';
    } else if (err.message.includes('network') || err.message.includes('ECONN')) {
      errorMessage += '🌐 *Network Error:* Gagal terhubung ke server.\n';
    } else if (err.message.includes('upload')) {
      errorMessage += '☁️ *Upload Error:* Gagal mengunggah gambar.\n';
    } else if (err.message.includes('konversi') || err.message.includes('kosong')) {
      errorMessage += '🎨 *Conversion Error:* Gagal mengkonversi gambar.\n';
    } else if (err.message.includes('ukuran')) {
      errorMessage += '📏 *Size Error:* Gambar terlalu besar.\n';
    } else {
      errorMessage += `🔧 *Error:* ${err.message}\n`;
    }
    
    errorMessage += '\n_Silakan coba lagi dengan gambar yang berbeda..._';
    
    m.reply(errorMessage);
  }
};

// Helper function untuk format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Help dan command configuration
handler.help = ['figure <versi>'].map(v => v + ' - Konversi gambar dengan efek figura');
handler.tags = ['aiv2'];
handler.command = /^(figure|figura)(2|3)?$/i;
handler.limit = 5;

export default handler;
