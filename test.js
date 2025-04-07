global.crypto = require('crypto');
const { google } = require("googleapis");
const { makeWASocket, useMultiFileAuthState, delay } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const CALENDAR_ID = process.env.CALENDAR_ID;
fs.writeFileSync("google-credentials.json", process.env.GOOGLE_CREDENTIALS);
let sock;

function extractPhoneNumber(description) {
    const regex = /Client phone: (\+?\d{10,15})/;
    const match = description?.match(regex);
    return match ? match[1] : null;
}

async function getAppointments() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "google-credentials.json",
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar("v3");

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const timeMin = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const timeMax = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    const response = await calendar.events.list({
        auth: authClient,
        calendarId: CALENDAR_ID,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
    });

    const appointments = response.data.items.map(event => ({
        title: event.summary,
        date: event.start.dateTime || event.start.date,
        phone: extractPhoneNumber(event.description),
    })).filter(event => event.phone);

    return appointments;
}

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        syncFullHistory: false,
        shouldSyncHistoryMessage: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ Conectat la WhatsApp!");
        } else if (connection === 'close') {
            console.log("🔴 Conexiunea a fost închisă, reîncerc...");
            if (lastDisconnect?.error?.output?.statusCode !== 401) {
                startWhatsApp();
            }
        }
    });
}

async function sendWhatsAppMessage(phone, message) {

    if (!sock) {
        console.log("⚠️ WhatsApp nu este conectat. Încep reconectarea...");
        await startWhatsApp();
    }

    console.log(`📨 Trimitere mesaj către ${phone}`);
    await sock.sendPresenceUpdate('available', `4${phone}@s.whatsapp.net`);
    await delay(1000); // 1 secunde pauză
    await sock.sendMessage(`4${phone}@s.whatsapp.net`, { text: message });
    console.log("✅ Mesaj trimis!");
}

async function checkAndSendReminders() {
    await startWhatsApp();
    await new Promise(resolve => setTimeout(resolve, 5000));
    const appointments = await getAppointments();

        if (!sock) {
            console.log("⚠️ WhatsApp nu este conectat. Reîncerc...");
            return;
        }
        console.log(`🔍 Am găsit ${appointments.length} programări pentru mâine.`);
        console.log("programari: ",appointments)

        const optionsShort = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Bucharest',
        };

        const mapLinkGoogle = 'https://maps.app.goo.gl/dj9dhxBNHuk7EtSg8';
        const mapLinkWaze = 'https://ul.waze.com/ul?place=ChIJiyP4_2b1ukARtyr3f8KIqgA&ll=44.32471970%2C28.60946700&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location';

        for(const appointment of appointments){
            const appointmentDate = new Date(appointment.date);
            const formattedDate = appointmentDate.toLocaleString('ro-RO', optionsShort);
            const dayAndTime = formattedDate.replace(/^.*?(\d{1,2} \w+.*?), (\d{2}:\d{2})$/, '$1 la ora $2');
            let message = `🔔 Reminder 🔔\nProgramare AMV Beauty Skin\nMâine, ${dayAndTime}.\nVă așteptăm cu drag!\n- 📍Maps: ${mapLinkGoogle}\n- 📍Waze: ${mapLinkWaze}`;
            await sendWhatsAppMessage(appointment.phone, message);
            // await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // setTimeout(() => process.exit(0), 5000);
}


checkAndSendReminders();