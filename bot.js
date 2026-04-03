const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCodeImage = null;
let sock = null;
let isConnected = false;

// Servidor web para mostrar el QR
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Bot Ferremuebles</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; }
                    .qr-container { margin: 30px auto; }
                    .status { font-size: 18px; margin: 20px; }
                    .connected { color: green; }
                    .waiting { color: orange; }
                    button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>🤖 Bot Ferremuebles</h1>
                <div class="status">
                    Estado: <span class="${isConnected ? 'connected' : 'waiting'}">${isConnected ? '🟢 Conectado' : '🟡 Esperando QR'}</span>
                </div>
                <div class="qr-container">
                    ${qrCodeImage ? `<img src="${qrCodeImage}" style="max-width: 300px; border: 1px solid #ccc; padding: 10px;">` : '<p>⏳ Generando código QR... espera unos segundos</p>'}
                </div>
                ${!isConnected && qrCodeImage ? '<p><strong>📱 Escanea este QR con WhatsApp</strong><br>Ajustes → Dispositivos vinculados → Vincular dispositivo</p>' : ''}
                ${isConnected ? '<p>✅ ¡Bot conectado! Ya puedes recibir mensajes automáticos</p>' : ''}
                <button onclick="location.reload()">🔄 Recargar QR</button>
            </body>
        </html>
    `);
});

app.get('/qr', (req, res) => {
    if (qrCodeImage) {
        res.send(`
            <html>
                <head><title>QR para WhatsApp</title></head>
                <body style="text-align: center; padding: 50px; font-family: Arial;">
                    <h1>📱 Escanea este QR</h1>
                    <img src="${qrCodeImage}" style="max-width: 300px;">
                    <p>1. Abre WhatsApp en tu teléfono</p>
                    <p>2. Ve a Ajustes → Dispositivos vinculados → Vincular un dispositivo</p>
                    <p>3. Escanea este código QR</p>
                </body>
            </html>
        `);
    } else {
        res.send('<h1>⏳ Generando QR, espera unos segundos...</h1>');
    }
});

app.get('/ping', (req, res) => res.send('ok'));

// Iniciar servidor
app.listen(PORT, () => console.log(`✅ Servidor web en puerto ${PORT}`));

// Función para iniciar el bot de WhatsApp
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Ferremuebles Bot', 'Chrome', '1.0.0']
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📱 NUEVO QR GENERADO');
            // Convertir QR a imagen para mostrar en web
            qrCodeImage = await QRCode.toDataURL(qr);
            console.log('✅ QR listo para escanear en la página web');
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom) && lastDisconnect.error.output.statusCode !== 401;
            console.log('❌ Conexión cerrada, reconectando...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            } else {
                isConnected = false;
                console.log('⚠️ Sesión cerrada, escanea el QR nuevamente');
            }
        }
        
        if (connection === 'open') {
            isConnected = true;
            qrCodeImage = null;
            console.log('✅ ¡BOT CONECTADO A WHATSAPP EXITOSAMENTE!');
            console.log('🎉 El bot ya está listo para recibir mensajes');
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    // Manejar mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const sender = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        console.log(`📨 Mensaje de ${sender}: ${text}`);
        
        try {
            let respuesta = '';
            const texto = text.toLowerCase().trim();
            
            if (texto === 'hola' || texto === 'hola bot') {
                respuesta = '¡Hola! Soy el bot de Ferremuebles. ¿En qué puedo ayudarte? 🛠️';
            } else if (texto === 'gracias') {
                respuesta = '¡De nada! Estamos para servirte. 😊';
            } else if (texto === 'chau' || texto === 'adios') {
                respuesta = '¡Hasta luego! Que tengas un buen día. 👋';
            } else {
                respuesta = 'Gracias por tu mensaje. Soy el asistente automático de Ferremuebles. Pronto te atenderá un representante. 📱';
            }
            
            await sock.sendMessage(sender, { text: respuesta });
            console.log(`✅ Respuesta enviada a ${sender}`);
            
        } catch (error) {
            console.error('❌ Error al responder:', error);
        }
    });
}

// Iniciar el bot
startBot();
console.log('🚀 Iniciando bot de WhatsApp con Baileys...');
