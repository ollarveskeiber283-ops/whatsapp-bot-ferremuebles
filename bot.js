const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

let qrCode = null;
let clientReady = false;

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
                    Estado: <span class="${clientReady ? 'connected' : 'waiting'}">${clientReady ? '🟢 Conectado' : '🟡 Esperando QR'}</span>
                </div>
                <div class="qr-container">
                    ${qrCode ? `<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}" style="max-width: 300px; border: 1px solid #ccc; padding: 10px;">` : '<p>⏳ Generando código QR... espera unos segundos</p>'}
                </div>
                ${!clientReady && qrCode ? '<p><strong>📱 Escanea este QR con WhatsApp</strong><br>Ajustes → Dispositivos vinculados → Vincular dispositivo</p>' : ''}
                ${clientReady ? '<p>✅ ¡Bot conectado! Ya puedes recibir mensajes automáticos</p>' : ''}
                <p><small>El QR se actualiza automáticamente si expira</small></p>
                <button onclick="location.reload()">🔄 Recargar QR</button>
            </body>
        </html>
    `);
});

app.get('/qr', (req, res) => {
    if (qrCode) {
        res.send(`
            <html>
                <head><title>QR para WhatsApp</title></head>
                <body style="text-align: center; padding: 50px; font-family: Arial;">
                    <h1>📱 Escanea este QR</h1>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}" style="max-width: 300px; border: 1px solid #ccc; padding: 10px;">
                    <p>1. Abre WhatsApp en tu teléfono</p>
                    <p>2. Ve a Ajustes → Dispositivos vinculados → Vincular un dispositivo</p>
                    <p>3. Escanea este código QR</p>
                    <button onclick="location.reload()">Recargar</button>
                </body>
            </html>
        `);
    } else {
        res.send('<h1>⏳ Generando código QR... espera unos segundos y recarga</h1>');
    }
});

app.get('/ping', (req, res) => res.send('ok'));

// Iniciar servidor
app.listen(PORT, () => console.log(`✅ Servidor web en puerto ${PORT}`));

// Configurar cliente de WhatsApp
console.log('🚀 Iniciando bot de WhatsApp...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

client.on('qr', (qr) => {
    qrCode = qr;
    console.log('📱 NUEVO CÓDIGO QR GENERADO');
    console.log('✅ Escanea el QR que aparece en la página web:');
    console.log(`   https://whatsapp-bot-ferremuebles-1.onrender.com/qr`);
    // También mostrar QR en consola por si acaso
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    clientReady = true;
    console.log('✅ ¡BOT CONECTADO A WHATSAPP EXITOSAMENTE!');
    console.log('🎉 El bot ya está listo para recibir mensajes');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
    console.log('🔄 Reintentando...');
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Bot desconectado:', reason);
    clientReady = false;
    qrCode = null;
    console.log('🔄 Esperando nuevo QR...');
});

client.on('message', async (message) => {
    // Evitar responder a mensajes del propio bot o estados
    if (message.from.includes('status@broadcast') || message.isStatus) return;
    
    console.log(`📨 Mensaje recibido de ${message.from}: ${message.body}`);
    
    try {
        let respuesta = '';
        const texto = message.body.toLowerCase().trim();
        
        // Respuestas básicas para pruebas
        if (texto === 'hola' || texto === 'hola bot') {
            respuesta = '¡Hola! Soy el bot de Ferremuebles. ¿En qué puedo ayudarte? 🛠️';
        } else if (texto === 'gracias') {
            respuesta = '¡De nada! Estamos para servirte. 😊';
        } else if (texto === 'chau' || texto === 'adios') {
            respuesta = '¡Hasta luego! Que tengas un buen día. 👋';
        } else {
            respuesta = 'Gracias por tu mensaje. Soy el asistente automático de Ferremuebles. Pronto te atenderá un representante. 📱';
        }
        
        await message.reply(respuesta);
        console.log(`✅ Respuesta enviada a ${message.from}`);
        
    } catch (error) {
        console.error('❌ Error al responder:', error);
        await message.reply('⚠️ Lo siento, tuve un problema técnico. Por favor intenta de nuevo.');
    }
});

client.initialize();

console.log('✨ Bot inicializado. Esperando QR...');
