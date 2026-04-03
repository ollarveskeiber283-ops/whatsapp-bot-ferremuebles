const venom = require('venom-bot');
const express = require('express');
const qrcode = require('qrcode-terminal');

const app = express();
const PORT = process.env.PORT || 3000;

let qrGenerated = false;
let clientReady = false;

// Servidor web simple
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>Bot Ferremuebles</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
                <h1>🤖 Bot Ferremuebles</h1>
                <p>Estado: ${clientReady ? '🟢 Conectado' : '🟡 Iniciando...'}</p>
                <p>QR: ${qrGenerated ? '✅ Generado (mira los logs de Render)' : '⏳ Generando...'}</p>
                <p>📱 Instrucciones: Busca el bloque ███ en los logs de Render</p>
            </body>
        </html>
    `);
});

app.get('/ping', (req, res) => res.send('ok'));

app.listen(PORT, () => console.log(`✅ Servidor web en puerto ${PORT}`));

// Iniciar Venom
console.log('🚀 Iniciando Venom...');

venom
    .create({
        session: 'ferremuebles-bot',
        headless: true,
        useChrome: false,
        logQR: true,
        browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    .then((client) => {
        clientReady = true;
        console.log('✅ ¡BOT CONECTADO A WHATSAPP!');
        
        // Escuchar mensajes
        client.onMessage(async (message) => {
            console.log(`📨 Mensaje: ${message.body}`);
            
            let respuesta = '';
            const texto = message.body.toLowerCase().trim();
            
            if (texto === 'hola') {
                respuesta = '¡Hola! Soy el bot de Ferremuebles. ¿En qué te ayudo? 🛠️';
            } else if (texto === 'gracias') {
                respuesta = '¡De nada! 😊';
            } else {
                respuesta = 'Gracias por tu mensaje. Soy el asistente automático de Ferremuebles. 📱';
            }
            
            await client.sendText(message.from, respuesta);
            console.log(`✅ Respondido a ${message.from}`);
        });
    })
    .catch((error) => {
        console.error('❌ Error:', error);
    });

console.log('🔄 QR aparecerá en los logs en unos segundos...');
