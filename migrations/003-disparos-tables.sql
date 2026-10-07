-- ============================================
-- TABELAS DE DISPAROS E CAMPANHAS
-- ============================================

-- Tabela de campanhas de broadcast
CREATE TABLE IF NOT EXISTS broadcast_campaigns (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    instance_id VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('oficial', 'qrcode')),
    total_numbers INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'failed')),
    scheduled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (instance_id) REFERENCES instances(zernio_profile_id) ON DELETE CASCADE
);

-- Tabela de recipientes de campanhas
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES broadcast_campaigns(id) ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_user_id ON broadcast_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_campaigns_status ON broadcast_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_campaign_id ON broadcast_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);

-- Atualizar tabela instances com coluna 'type' se não existir
ALTER TABLE instances ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'oficial' CHECK (type IN ('oficial', 'qrcode'));
ALTER TABLE instances ADD COLUMN IF NOT EXISTS qr_code TEXT;
