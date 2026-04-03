const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Configuración
const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let clienteWhatsApp = null;
let qrGenerado = null;
let geminiAI = null;

// Inicializar Gemini si hay API key
if (GEMINI_API_KEY) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiAI = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log('✅ IA Gemini inicializada');
}

// Servidor web para el panel
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Bot WhatsApp Ferremuebles</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🤖 Bot de WhatsApp - Ferremuebles</h1>
                <p>Estado: ${clienteWhatsApp ? '🟢 Conectado' : '🟡 Desconectado'}</p>
                <p>IA: ${geminiAI ? '✅ Activa' : '❌ No configurada'}</p>
                <a href="/qr">📱 Ver código QR</a>
            </body>
        </html>
    `);
});

app.get('/qr', (req, res) => {
    if (qrGenerado) {
        res.send(`
            <html>
                <head><title>QR para WhatsApp</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>📱 Escanea este QR con WhatsApp</h1>
                    <p>Ajustes → Dispositivos vinculados → Vincular dispositivo</p>
                    <img src="${qrGenerado}" style="max-width: 300px;">
                    <p><small>El QR expira en 30 segundos</small></p>
                </body>
            </html>
        `);
    } else {
        res.send('<h1>⚠️ No hay QR disponible. Espera a que el bot inicie.</h1>');
    }
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

// Iniciar servidor web
app.listen(PORT, () => {
    console.log(`✅ Panel web en puerto ${PORT}`);
});

// Inicializar cliente de WhatsApp
clienteWhatsApp = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

clienteWhatsApp.on('qr', (qr) => {
    qrGenerado = qr;
    qrcode.generate(qr, { small: true });
    console.log('📱 Escanea el QR con WhatsApp');
});

clienteWhatsApp.on('ready', () => {
    qrGenerado = null;
    console.log('✅ Bot de WhatsApp conectado!');
});

clienteWhatsApp.on('message', async (message) => {
    console.log(`📨 Mensaje de ${message.from}: ${message.body}`);
    
    // Evitar responder a mensajes del propio bot
    if (message.from.includes('status@broadcast')) return;
    
    try {
        let respuesta = '';
        
        // Usar IA si está disponible
        if (geminiAI) {
            const result = await geminiAI.generateContent(`
                Eres un asistente de WhatsApp para "Ferremuebles", una ferretería.
                Responde de manera amable y útil. Sé breve y directo.
                Mensaje del usuario: ${message.body}
            `);
            respuesta = result.response.text();
        } else {
            // Respuesta simple si no hay IA
            respuesta = `Hola! Soy el bot de Ferremuebles. Recibí tu mensaje: "${message.body}".\n\nPara usar la IA, configura la variable GEMINI_API_KEY.`;
        }
        
        await message.reply(respuesta);
        console.log(`✅ Respondido a ${message.from}`);
        
    } catch (error) {
        console.error('❌ Error al responder:', error);
        await message.reply('⚠️ Lo siento, tuve un problema técnico. Intenta de nuevo más tarde.');
    }
});

clienteWhatsApp.initialize();

console.log('🚀 Bot de Ferremuebles iniciado...');
