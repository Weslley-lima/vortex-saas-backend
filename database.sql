-- ============================================
-- DATABASE: WhatsApp SaaS Multi-Tenant
-- Descrição: Schema para gerenciar usuários e instâncias de WhatsApp
-- ============================================

-- Criar banco de dados (executar como superuser)
CREATE DATABASE whatsapp_saas_db;

-- Conectar ao banco de dados
\c whatsapp_saas_db;

-- ============================================
-- TABELA: users
-- Descrição: Armazena informações dos usuários do SaaS
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscas rápidas por email
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- TABELA: instances
-- Descrição: Armazena instâncias de WhatsApp conectadas via Zernio
-- ============================================
CREATE TABLE instances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    zernio_profile_id VARCHAR(255) UNIQUE NOT NULL,
    instance_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'pending', -- pending, connected, disconnected, error
    webhook_url TEXT,
    metadata JSONB DEFAULT '{}', -- Armazena dados adicionais da Zernio
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Chave estrangeira ligando a instância ao usuário
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índice para buscas rápidas por user_id
CREATE INDEX idx_instances_user_id ON instances(user_id);

-- Índice para buscas rápidas por zernio_profile_id
CREATE INDEX idx_instances_zernio_profile_id ON instances(zernio_profile_id);

-- ============================================
-- TABELA: automations (Opcional para fase 2)
-- Descrição: Armazena automações e fluxos de mensagens
-- ============================================
CREATE TABLE automations (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER NOT NULL,
    automation_name VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(50), -- message_received, keyword, time_based
    trigger_value TEXT,
    action_type VARCHAR(50), -- send_message, send_media, send_template
    action_value TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Chave estrangeira ligando a automação à instância
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

-- Índice para buscas rápidas por instance_id
CREATE INDEX idx_automations_instance_id ON automations(instance_id);

-- ============================================
-- TABELA: message_logs (Opcional para fase 2)
-- Descrição: Registra todas as mensagens enviadas e recebidas
-- ============================================
CREATE TABLE message_logs (
    id SERIAL PRIMARY KEY,
    instance_id INTEGER NOT NULL,
    phone_from VARCHAR(20) NOT NULL,
    phone_to VARCHAR(20) NOT NULL,
    message_text TEXT,
    direction VARCHAR(20), -- incoming, outgoing
    status VARCHAR(50), -- sent, delivered, read, failed
    zernio_message_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Chave estrangeira ligando ao log à instância
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

-- Índice para buscas por instance_id
CREATE INDEX idx_message_logs_instance_id ON message_logs(instance_id);

-- Índice para buscas por data
CREATE INDEX idx_message_logs_created_at ON message_logs(created_at);

-- ============================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela users
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger na tabela instances
CREATE TRIGGER update_instances_updated_at
BEFORE UPDATE ON instances
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger na tabela automations
CREATE TRIGGER update_automations_updated_at
BEFORE UPDATE ON automations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERIR DADOS DE TESTE (Opcional)
-- ============================================
INSERT INTO users (name, email, password_hash, plan)
VALUES ('Usuário Demo', 'demo@teste.com', 'hashed_password_here', 'professional');
