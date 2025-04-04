const { google } = require("googleapis");
const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");



const keyFilePath = path.resolve(__dirname, 'config', 'amv-beauty-skin-453413-f3840ce797a0.json');
const keyFileContent = fs.readFileSync(keyFilePath, 'utf-8');
const credentials = JSON.parse(keyFileContent);



const API_KEY = "AIzaSyBXadJIiwbZZtobzh42D-umDK3XScHM8ZE";  
const CALENDAR_ID = "d1fa751e242a84ed93ddc2857e6bfb9b5e8bc3b0688a64012bb6c73b456f0949@group.calendar.google.com";






function extractPhoneNumber(description) {
    const regex = /Client phone: (\+?\d{10,15})/;
    const match = description?.match(regex);
    return match ? match[1] : null;
}


async function getAppointments() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "./config/amv-beauty-skin-453413-f3840ce797a0.json",  
        // credentials,
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    const authClient = await auth.getClient();
    const calendar = google.calendar("v3");

    const response = await calendar.events.list({
        auth: authClient,
        calendarId: CALENDAR_ID,
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: "startTime",
    });

    return response.data.items.map(event => ({
        title: event.summary,
        date: event.start.dateTime || event.start.date,
        phone: extractPhoneNumber(event.description),
    })).filter(event => event.phone);
}


async function sendWhatsAppMessage(phone, message) {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info");
    console.log("a intrat in sendWhatsAppMessage function!!!!!!!!!!")
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ Conectat la WhatsApp!");
        } else if (connection === 'close') {
            console.log("🔴 Conexiunea a fost închisă, reîncerc...");
            if (lastDisconnect?.error?.output?.statusCode !== 401) {
                startSock(); // Reîncearcă logarea
            }
        }
    });
    console.log(`Mesaj trimis cÄƒtre ${phone}`);
}

// ðŸ”¹ Programare zilnicÄƒ a notificÄƒrilor
async function checkAndSendReminders() {
    const appointments = await getAppointments();

    console.log("verificare appointments: ", appointments);

    // for (let app of appointments) {
    //     const message = `Reminder: Aveti programare maine pentru ${app.title}!`;
    //     await sendWhatsAppMessage(app.phone, message);
    // }
}

const sendMessage = async () => {
    sendWhatsAppMessage("0728017513@s.whatsapp.net", { text: "Salut! Test mesaj." });
    console.log("✅ Mesaj trimis!");
}
setTimeout(sendMessage(),5000);

// checkAndSendReminders();