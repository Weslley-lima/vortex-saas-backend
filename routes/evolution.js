// ============================================
// ROUTES - EVOLUTION API (QR CODE WHATSAPP)
// ============================================

const express = require('express');
const router = express.Router();
const EVOLUTION_CONFIG = require('../config/evolution-api');

// GET /api/evolution/qrcode - Gerar QR Code
router.post('/qrcode', async (req, res) => {
    try {
        const { user_id, instance_name } = req.body;
        const db = req.app.locals.db;

        if (!user_id || !instance_name) {
            return res.status(400).json({
                message: 'Erro: user_id e instance_name são obrigatórios',
                error: 'MISSING_FIELDS'
            });
        }

        // Simular geração de QR Code (em produção, chamar Evolution API)
        const qrCode = {
            id: `qr_${Date.now()}`,
            user_id: user_id,
            instance_name: instance_name,
            qr_base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6ZAAAAFUlEQVR42mNk+M9QzwAEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC`, // Placeholder
            status: 'pending',
            created_at: new Date(),
            expires_at: new Date(Date.now() + EVOLUTION_CONFIG.instance.qrcode.timeout)
        };

        // Salvar no banco
        await db.query(
            `INSERT INTO instances (user_id, instance_name, qr_code, status, type) 
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id, instance_name) DO UPDATE 
             SET qr_code = $3, status = $4`,
            [user_id, instance_name, qrCode.qr_base64, 'connecting', 'qrcode']
        );

        res.status(200).json({
            message: 'QR Code gerado com sucesso',
            data: {
                qr_code: qrCode.qr_base64,
                instance_id: qrCode.id,
                expires_in: EVOLUTION_CONFIG.instance.qrcode.timeout / 1000,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        res.status(500).json({
            message: 'Erro ao gerar QR Code',
            error: error.message
        });
    }
});

// GET /api/evolution/status - Status da instância
router.get('/status/:instance_id', async (req, res) => {
    try {
        const { instance_id } = req.params;
        const db = req.app.locals.db;

        const result = await db.query(
            `SELECT id, instance_name, status, type FROM instances WHERE id = $1`,
            [instance_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Instância não encontrada',
                error: 'INSTANCE_NOT_FOUND'
            });
        }

        res.status(200).json({
            message: 'Status da instância',
            data: {
                instance_id: result.rows[0].id,
                name: result.rows[0].instance_name,
                status: result.rows[0].status,
                type: result.rows[0].type
            }
        });
    } catch (error) {
        console.error('Erro ao obter status:', error);
        res.status(500).json({
            message: 'Erro ao obter status',
            error: error.message
        });
    }
});

// POST /api/evolution/send - Enviar mensagem via QR Code
router.post('/send', async (req, res) => {
    try {
        const { instance_id, phone_number, message } = req.body;
        const db = req.app.locals.db;

        if (!instance_id || !phone_number || !message) {
            return res.status(400).json({
                message: 'Erro: instance_id, phone_number e message são obrigatórios',
                error: 'MISSING_FIELDS'
            });
        }

        // Validar instância
        const instanceResult = await db.query(
            `SELECT * FROM instances WHERE id = $1`,
            [instance_id]
        );

        if (instanceResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Instância não encontrada',
                error: 'INSTANCE_NOT_FOUND'
            });
        }

        // Simular envio (em produção, chamar Evolution API)
        const messageLog = {
            id: `msg_${Date.now()}`,
            instance_id: instance_id,
            phone_number: phone_number,
            message: message,
            status: 'sent',
            type: 'qrcode',
            sent_at: new Date()
        };

        // Salvar no banco
        await db.query(
            `INSERT INTO message_logs (instance_id, phone_number, message, status, direction)
             VALUES ($1, $2, $3, $4, $5)`,
            [instance_id, phone_number, message, 'sent', 'outgoing']
        );

        res.status(200).json({
            message: 'Mensagem enviada com sucesso',
            data: {
                message_id: messageLog.id,
                status: 'sent',
                sent_at: messageLog.sent_at
            }
        });
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        res.status(500).json({
            message: 'Erro ao enviar mensagem',
            error: error.message
        });
    }
});

module.exports = router;
