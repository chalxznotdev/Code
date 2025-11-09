// plugins/updatebaileys.cjs

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

let handler = async (m, { conn, text, usedPrefix }) => {
  // Cek owner menggunakan multiple methods
  const isOwner = [
    m.sender === conn.user.id.split(':')[0] + '@s.whatsapp.net', // Bot owner
    m.sender === "628xxxxxxxxxx@s.whatsapp.net", // Ganti dengan nomor owner kamu
    conn.decodeJid(conn.user?.id) === m.sender, // Alternative owner check
  ].some(Boolean)

  if (!isOwner) {
    return conn.reply(m.chat, "❌ Akses ditolak! Hanya owner yang bisa pakai command ini.", m)
  }

  if (!text) {
    return conn.reply(m.chat, 
      `❌ *Format Penggunaan:*\n` +
      `• ${usedPrefix}updatebaileys <package_name>\n\n` +
      `*Contoh:*\n` +
      `• ${usedPrefix}updatebaileys @adiwajshing/baileys\n` +
      `• ${usedPrefix}updatebaileys @whiskeysockets/baileys\n` +
      `• ${usedPrefix}updatebaileys baileys@latest`, m
    )
  }

  const oldBaileys = "@whiskeysockets/baileys"
  const newBaileys = text.trim()

  try {
    await conn.reply(m.chat, 
      `🔄 *Memulai Update Baileys...*\n\n` +
      `📦 *Package Baru:* ${newBaileys}\n` +
      `⏰ *Estimasi:* 1-3 menit\n` +
      `📋 *Proses:*\n` +
      `1. Update referensi di file\n` +
      `2. Hapus node_modules\n` +
      `3. Install dependencies\n` +
      `4. Restart bot\n\n` +
      `Mohon tunggu...`, m
    )

    // Step 1: Update references in files
    await conn.reply(m.chat, "📝 *Step 1:* Memperbarui referensi Baileys di semua file...", m)
    
    const extensions = ["*.js", "*.cjs", "*.mjs", "*.ts", "*.json"]
    let updatedFiles = 0

    for (const ext of extensions) {
      try {
        // Gunakan grep dan sed untuk mencari dan mengganti
        const findCmd = `grep -r -l --include="${ext}" "${oldBaileys}" . 2>/dev/null || true`
        const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
        
        for (const file of files) {
          if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8')
            const newContent = content.replace(new RegExp(oldBaileys, 'g'), newBaileys)
            fs.writeFileSync(file, newContent)
            updatedFiles++
            console.log(`✅ Updated: ${file}`)
          }
        }
      } catch (err) {
        console.log(`⚠️ No files found for extension: ${ext}`)
      }
    }

    // Step 2: Update package.json
    await conn.reply(m.chat, `📦 *Step 2:* Memperbarui package.json... (${updatedFiles} file diperbarui)`, m)
    
    if (fs.existsSync("package.json")) {
      try {
        const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
        
        // Update dependencies
        if (packageJson.dependencies && packageJson.dependencies[oldBaileys]) {
          packageJson.dependencies[newBaileys] = packageJson.dependencies[oldBaileys]
          delete packageJson.dependencies[oldBaileys]
        }
        
        // Update devDependencies
        if (packageJson.devDependencies && packageJson.devDependencies[oldBaileys]) {
          packageJson.devDependencies[newBaileys] = packageJson.devDependencies[oldBaileys]
          delete packageJson.devDependencies[oldBaileys]
        }

        fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2))
        console.log("✅ Updated package.json")
      } catch (err) {
        console.error("❌ Error updating package.json:", err.message)
      }
    }

    // Step 3: Remove node_modules
    await conn.reply(m.chat, "🗑️ *Step 3:* Menghapus node_modules lama...", m)
    
    if (fs.existsSync("node_modules")) {
      try {
        execSync("rm -rf node_modules", { stdio: "inherit" })
        console.log("✅ Removed node_modules")
      } catch (err) {
        console.error("❌ Error removing node_modules:", err.message)
      }
    }

    // Step 4: Clear npm cache
    await conn.reply(m.chat, "🧹 *Step 4:* Membersihkan npm cache...", m)
    
    try {
      execSync("npm cache clean --force", { stdio: "inherit" })
      console.log("✅ Cleared npm cache")
    } catch (err) {
      console.error("❌ Error clearing npm cache:", err.message)
    }

    // Step 5: Install dependencies
    await conn.reply(m.chat, "📥 *Step 5:* Menginstall dependencies baru...", m)
    
    try {
      execSync("npm install", { stdio: "inherit" })
      console.log("✅ Dependencies installed")
    } catch (err) {
      console.error("❌ Error installing dependencies:", err.message)
      throw new Error("Gagal install dependencies, cek koneksi internet")
    }

    // Step 6: Verify installation
    await conn.reply(m.chat, "🔍 *Step 6:* Memverifikasi instalasi...", m)
    
    try {
      const checkCmd = `npm list ${newBaileys}`
      execSync(checkCmd, { stdio: "inherit" })
      console.log("✅ Package verified")
    } catch (err) {
      console.error("❌ Package verification failed:", err.message)
    }

    // Final report
    const successMessage = 
      `✅ *UPDATE BERHASIL!*\n\n` +
      `📦 *Package:* ${newBaileys}\n` +
      `📝 *File Diperbarui:* ${updatedFiles}\n` +
      `🕒 *Waktu:* ${new Date().toLocaleTimeString('id-ID')}\n\n` +
      `🔄 *Bot akan restart dalam 10 detik...*\n` +
      `Jangan tutup terminal!`

    await conn.reply(m.chat, successMessage, m)

    // Countdown before restart
    for (let i = 10; i > 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (i <= 5) {
        await conn.reply(m.chat, `⏰ Restart dalam ${i}...`, m)
      }
    }

    await conn.reply(m.chat, "🚀 Restarting bot now...", m)
    
    // Graceful restart
    setTimeout(() => {
      console.log("🔄 Restarting process...")
      process.exit(0)
    }, 2000)

  } catch (err) {
    console.error("❌ Error update Baileys:", err)
    
    const errorMessage = 
      `❌ *GAGAL UPDATE BAILEYS*\n\n` +
      `*Error:* ${err.message}\n\n` +
      `*Solusi:*\n` +
      `1. Cek koneksi internet\n` +
      `2. Pastikan package name valid\n` +
      `3. Cek permission file\n` +
      `4. Coba manual: npm install ${newBaileys}`

    await conn.reply(m.chat, errorMessage, m)
  }
}

// Alternative handler for different command variations
handler.help = [
  "updatebaileys <package> - Update Baileys package",
  "upbaileys <package> - Short command for update"
]

handler.tags = ["owner", "maintenance"]
handler.command = /^(updatebaileys|upbaileys|ubaileys)$/i
handler.owner = true
handler.limit = false
handler.private = true

module.exports = handler

// Export utility functions for reuse
module.exports.updateBaileysReferences = async function(oldPackage, newPackage) {
  const extensions = ["*.js", "*.cjs", "*.mjs", "*.ts", "*.json"]
  let updatedCount = 0

  for (const ext of extensions) {
    try {
      const findCmd = `grep -r -l --include="${ext}" "${oldPackage}" . 2>/dev/null || true`
      const files = execSync(findCmd, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
      
      for (const file of files) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8')
          const newContent = content.replace(new RegExp(oldPackage, 'g'), newPackage)
          fs.writeFileSync(file, newContent)
          updatedCount++
        }
      }
    } catch (err) {
      // Continue to next extension
    }
  }

  return updatedCount
}

module.exports.getCurrentBaileysVersion = function() {
  try {
    if (fs.existsSync("package.json")) {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      for (const [pkg, version] of Object.entries(deps)) {
        if (pkg.includes('baileys')) {
          return { package: pkg, version: version }
        }
      }
    }
    return null
  } catch (err) {
    return null
  }
                         }
