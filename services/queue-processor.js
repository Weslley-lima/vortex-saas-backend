// ============================================
// QUEUE PROCESSOR - Sistema de Fila Manual
// ============================================

class QueueProcessor {
    constructor(db) {
        this.db = db;
        this.isRunning = false;
        this.interval = null;
    }

    // Iniciar processador de fila
    start(intervalMs = 5000) {
        if (this.isRunning) {
            console.log('⚠️ Queue processor já está rodando');
            return;
        }

        this.isRunning = true;
        console.log('✅ Queue processor iniciado - Intervalo:', intervalMs / 1000, 's');

        this.interval = setInterval(() => {
            this.processPendingJobs();
        }, intervalMs);
    }

    // Parar processador
    stop() {
        if (!this.isRunning) return;
        clearInterval(this.interval);
        this.isRunning = false;
        console.log('⛔ Queue processor parado');
    }

    // Processar jobs pendentes
    async processPendingJobs() {
        try {
            const result = await this.db.query(
                `SELECT id, user_id, instance_id, message, method 
                 FROM broadcast_campaigns 
                 WHERE status = 'pending' OR (status = 'scheduled' AND scheduled_at <= NOW())
                 LIMIT 5`
            );

            const campaigns = result.rows;

            for (const campaign of campaigns) {
                await this.processCampaign(campaign);
            }
        } catch (error) {
            console.error('❌ Erro ao processar jobs:', error);
        }
    }

    // Processar uma campanha
    async processCampaign(campaign) {
        try {
            console.log(`📤 Processando campanha: ${campaign.id}`);

            await this.db.query(
                `UPDATE broadcast_campaigns SET status = 'processing' WHERE id = $1`,
                [campaign.id]
            );

            const numbersResult = await this.db.query(
                `SELECT id, phone_number FROM broadcast_recipients 
                 WHERE campaign_id = $1 AND status = 'pending'
                 LIMIT 100`,
                [campaign.id]
            );

            const recipients = numbersResult.rows;
            let sent = 0;
            let failed = 0;

            for (const recipient of recipients) {
                try {
                    await this.sendMessage(
                        campaign.instance_id,
                        recipient.phone_number,
                        campaign.message,
                        campaign.method
                    );

                    await this.db.query(
                        `UPDATE broadcast_recipients 
                         SET status = 'sent', sent_at = NOW() 
                         WHERE id = $1`,
                        [recipient.id]
                    );

                    sent++;
                } catch (err) {
                    console.error(`❌ Erro ao enviar para ${recipient.phone_number}:`, err.message);

                    await this.db.query(
                        `UPDATE broadcast_recipients 
                         SET status = 'failed', error_message = $2 
                         WHERE id = $1`,
                        [recipient.id, err.message]
                    );

                    failed++;
                }

                await this.sleep(100);
            }

            const updateResult = await this.db.query(
                `UPDATE broadcast_campaigns 
                 SET sent_count = sent_count + $1, 
                     failed_count = failed_count + $2
                 WHERE id = $3
                 RETURNING sent_count, failed_count, total_numbers`,
                [sent, failed, campaign.id]
            );

            const updated = updateResult.rows[0];

            if ((updated.sent_count + updated.failed_count) >= updated.total_numbers) {
                await this.db.query(
                    `UPDATE broadcast_campaigns SET status = 'completed' WHERE id = $1`,
                    [campaign.id]
                );
                console.log(`✅ Campanha ${campaign.id} completada!`);
            }
        } catch (error) {
            console.error(`❌ Erro ao processar campanha ${campaign.id}:`, error);

            await this.db.query(
                `UPDATE broadcast_campaigns SET status = 'failed' WHERE id = $1`,
                [campaign.id]
            );
        }
    }

    // Enviar mensagem (simulado)
    async sendMessage(instanceId, phoneNumber, message, method) {
        console.log(`📨 Enviando para ${phoneNumber} via ${method}`);
        await this.sleep(50);

        await this.db.query(
            `INSERT INTO message_logs (instance_id, phone_number, message, status, direction)
             VALUES ($1, $2, $3, $4, $5)`,
            [instanceId, phoneNumber, message, 'sent', 'outgoing']
        );
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = QueueProcessor;
