// plugins/updatebaileys.js

import { execSync } from "child_process"
import fs from "fs"

let handler = async (m, { conn, text }) => {
  const ownerID = "628xxxxxxxxxx@s.whatsapp.net" // ganti dengan nomor owner kamu

  if (m.sender !== ownerID)
    return conn.reply(m.chat, "❌ Akses ditolak! Hanya owner yang bisa pakai command ini.", m)

  if (!text)
    return conn.reply(m.chat, "❌ Format: .updatebaileys <new_baileys>\nContoh: .updatebaileys @adiwajshing/baileys", m)

  const oldBaileys = "@whiskeysockets/baileys"
  const newBaileys = text.trim()

  try {
    await conn.reply(m.chat, "🔄 Mulai update Baileys... Mohon tunggu, ini bisa makan waktu.", m)

    const extensions = ["*.js", "*.ts", "*.json"]
    for (const ext of extensions) {
      execSync(`find . -name "${ext}" -type f -exec sed -i "s/${oldBaileys}/${newBaileys}/g" {} +`, { stdio: "inherit" })
    }

    if (fs.existsSync("node_modules")) {
      execSync("rm -rf node_modules", { stdio: "inherit" })
    }

    execSync("npm install", { stdio: "inherit" })

    await conn.reply(m.chat, "✅ Update selesai! Bot akan restart dalam 5 detik...", m)

    setTimeout(() => {
      process.exit(0)
    }, 5000)
  } catch (err) {
    console.error("Error update Baileys:", err)
    await conn.reply(m.chat, "❌ Terjadi error saat update:\n" + err.message, m)
  }
}

handler.help = ["updatebaileys <new_baileys>"]
handler.tags = ["owner"]
handler.command = /^updatebaileys$/i
handler.owner = true

export default handler
