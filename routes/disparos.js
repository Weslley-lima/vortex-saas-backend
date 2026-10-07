// ============================================
// ROUTES - DISPAROS (BULK MESSAGING)
// ============================================

const express = require('express');
const router = express.Router();

// POST /api/disparos/criar - Criar campanha de disparo
router.post('/criar', async (req, res) => {
    try {
        const { user_id, instance_id, message, metodo, numbers, scheduled_at } = req.body;
        const db = req.app.locals.db;

        if (!user_id || !instance_id || !message || !metodo || !numbers || numbers.length === 0) {
            return res.status(400).json({
                message: 'Erro: Campos obrigatórios faltando',
                required: ['user_id', 'instance_id', 'message', 'metodo', 'numbers'],
                error: 'MISSING_FIELDS'
            });
        }

        // Validar metodo
        if (!['oficial', 'qrcode'].includes(metodo)) {
            return res.status(400).json({
                message: 'Erro: metodo deve ser "oficial" ou "qrcode"',
                error: 'INVALID_METHOD'
            });
        }

        // Criar campanha
        const result = await db.query(
            `INSERT INTO broadcast_campaigns 
             (user_id, instance_id, message, method, scheduled_at, total_numbers, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                user_id,
                instance_id,
                message,
                metodo,
                scheduled_at || new Date(),
                numbers.length,
                scheduled_at ? 'scheduled' : 'pending'
            ]
        );

        const campaign = result.rows[0];

        // Salvar números no banco
        for (const number of numbers) {
            await db.query(
                `INSERT INTO broadcast_recipients 
                 (campaign_id, phone_number, status)
                 VALUES ($1, $2, $3)`,
                [campaign.id, number, 'pending']
            );
        }

        res.status(201).json({
            message: 'Campanha criada com sucesso',
            data: {
                campaign_id: campaign.id,
                total_numbers: numbers.length,
                method: metodo,
                status: campaign.status,
                scheduled_at: campaign.scheduled_at
            }
        });
    } catch (error) {
        console.error('Erro ao criar campanha:', error);
        res.status(500).json({
            message: 'Erro ao criar campanha',
            error: error.message
        });
    }
});

// POST /api/disparos/enviar - Disparar mensagens
router.post('/enviar', async (req, res) => {
    try {
        const { campaign_id, metodo } = req.body;
        const db = req.app.locals.db;

        // Buscar campanha
        const campaignResult = await db.query(
            `SELECT * FROM broadcast_campaigns WHERE id = $1`,
            [campaign_id]
        );

        if (campaignResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Campanha não encontrada',
                error: 'CAMPAIGN_NOT_FOUND'
            });
        }

        const campaign = campaignResult.rows[0];

        // Buscar números da campanha
        const numbersResult = await db.query(
            `SELECT * FROM broadcast_recipients WHERE campaign_id = $1 AND status = 'pending'`,
            [campaign_id]
        );

        const numbers = numbersResult.rows;

        if (numbers.length === 0) {
            return res.status(400).json({
                message: 'Nenhum número pendente para enviar',
                error: 'NO_PENDING_NUMBERS'
            });
        }

        // Processar envios (simular fila)
        let sent = 0;
        let failed = 0;

        for (const recipient of numbers) {
            try {
                // Em produção, aqui chamaria Zernio API ou Evolution API
                // Por enquanto, simular sucesso
                await db.query(
                    `UPDATE broadcast_recipients 
                     SET status = 'sent', sent_at = NOW()
                     WHERE id = $1`,
                    [recipient.id]
                );
                
                // Registrar no message_logs
                await db.query(
                    `INSERT INTO message_logs 
                     (instance_id, phone_number, message, status, direction)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [campaign.instance_id, recipient.phone_number, campaign.message, 'sent', 'outgoing']
                );

                sent++;
            } catch (err) {
                console.error(`Erro ao enviar para ${recipient.phone_number}:`, err);
                await db.query(
                    `UPDATE broadcast_recipients 
                     SET status = 'failed', error_message = $2
                     WHERE id = $1`,
                    [recipient.id, err.message]
                );
                failed++;
            }
        }

        // Atualizar status da campanha
        await db.query(
            `UPDATE broadcast_campaigns 
             SET status = 'completed', sent_count = $2, failed_count = $3
             WHERE id = $1`,
            [campaign_id, sent, failed]
        );

        res.status(200).json({
            message: 'Disparos iniciados',
            data: {
                campaign_id: campaign_id,
                total: numbers.length,
                sent: sent,
                failed: failed,
                status: 'processing'
            }
        });
    } catch (error) {
        console.error('Erro ao enviar disparos:', error);
        res.status(500).json({
            message: 'Erro ao enviar disparos',
            error: error.message
        });
    }
});

// GET /api/disparos/status/:campaign_id - Status da campanha
router.get('/status/:campaign_id', async (req, res) => {
    try {
        const { campaign_id } = req.params;
        const db = req.app.locals.db;

        const result = await db.query(
            `SELECT * FROM broadcast_campaigns WHERE id = $1`,
            [campaign_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Campanha não encontrada',
                error: 'CAMPAIGN_NOT_FOUND'
            });
        }

        const campaign = result.rows[0];

        // Contar status dos recipientes
        const statsResult = await db.query(
            `SELECT 
                status,
                COUNT(*) as count
             FROM broadcast_recipients
             WHERE campaign_id = $1
             GROUP BY status`,
            [campaign_id]
        );

        const stats = statsResult.rows.reduce((acc, row) => {
            acc[row.status] = row.count;
            return acc;
        }, {});

        res.status(200).json({
            message: 'Status da campanha',
            data: {
                campaign_id: campaign_id,
                status: campaign.status,
                method: campaign.method,
                total: campaign.total_numbers,
                sent: campaign.sent_count || 0,
                failed: campaign.failed_count || 0,
                pending: stats.pending || 0,
                created_at: campaign.created_at,
                scheduled_at: campaign.scheduled_at
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

module.exports = router;
