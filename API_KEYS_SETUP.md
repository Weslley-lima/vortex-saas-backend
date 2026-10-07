# 🔑 Configuração de Chaves de API - Vortex Backend

## 📋 Visão Geral das APIs Implementadas

```
┌─────────────────────────────────────────────────────────┐
│         Vortex WhatsApp SaaS Backend APIs               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Evolution API (QR Code WhatsApp)                   │
│     Status: ✅ Implementado (precisa integração real)   │
│                                                         │
│  2. Zernio API (Official WhatsApp)                     │
│     Status: ✅ Chaves já configuradas                   │
│                                                         │
│  3. PostgreSQL Database                                │
│     Status: ✅ Schema criado e migrado                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 1️⃣ **EVOLUTION API** (QR Code WhatsApp)

### O que é?
- Permite conectar WhatsApp Web via QR Code
- Sem necessidade de aprovação oficial
- Serviço gratuito
- Integração por HTTP REST

### Chaves Necessárias:

```env
# Evolution API Configuration
EVOLUTION_API_BASE_URL=https://api.evolution.com.br
EVOLUTION_API_KEY=your_evolution_api_key_here
EVOLUTION_INSTANCE_NAME=your_instance_name
EVOLUTION_WEBHOOK_URL=https://seu-dominio.com/webhooks/evolution
```

### Como Obter as Chaves:

1. **Acessar Evolution API:**
   - Site: https://evolution-api.com ou https://api.evolution.com.br
   - Criar conta
   - Gerar API Key no painel

2. **Configurar no `.env`:**
   ```env
   EVOLUTION_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxx
   EVOLUTION_API_BASE_URL=https://api.evolution.com.br
   ```

3. **Endpoints Evolution que usamos:**
   - `POST /instances` - Criar instância
   - `GET /instances/:id/status` - Status da instância
   - `POST /messages/send` - Enviar mensagem
   - `POST /webhooks` - Receber notificações

### Arquivo de Configuração:

```javascript
// config/evolution-api.js
module.exports = {
    baseUrl: process.env.EVOLUTION_API_BASE_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
    instance: {
        qrcode: {
            timeout: 60000, // 60 segundos
            maxRetries: 3
        },
        whatsapp: {
            version: '2.0',
            timeout: 30000
        }
    }
};
```

---

## 2️⃣ **ZERNIO API** (Official WhatsApp)

### O que é?
- API oficial do WhatsApp Cloud
- Requer aprovação Meta
- Badge verificado
- Produção ready
- Pagamento por mensagem

### Chaves Já Configuradas:

```env
# .env (já preenchido)
ZERNIO_API_KEY=sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4
ZERNIO_BASE_URL=https://zernio.com/api/v1
```

### Como Funciona:

1. **Zernio é um provedor** que encapsula WhatsApp Cloud API
2. **Seus dados de acesso:**
   ```
   API Key: sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4
   Base URL: https://zernio.com/api/v1
   ```

3. **Endpoints Zernio que usamos:**
   - `POST /profiles` - Criar perfil/instância
   - `POST /messages/send` - Enviar mensagem
   - `GET /profiles/:id/status` - Status
   - `POST /webhooks` - Webhooks de notificação

### Para usar em produção:

1. **Verificar chave Zernio:**
   ```bash
   curl -H "Authorization: Bearer sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4" \
        https://zernio.com/api/v1/profiles
   ```

2. **Adicionar ao `.env` em produção:**
   ```env
   ZERNIO_API_KEY=sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4
   ZERNIO_BASE_URL=https://zernio.com/api/v1
   ```

---

## 3️⃣ **DATABASE** (PostgreSQL)

### Configuração Atual:

```env
# .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_saas_db
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres_aqui
```

### Para Produção (Exemplo AWS RDS):

```env
# Production
DB_HOST=whatsapp-saas.xxxxx.rds.amazonaws.com
DB_PORT=5432
DB_NAME=whatsapp_saas_db_prod
DB_USER=admin
DB_PASSWORD=SecurePasswordHere123!@#
```

### Tabelas Criadas:

1. **users** - Usuários do SaaS
2. **instances** - Instâncias WhatsApp (Zernio + Evolution)
3. **message_logs** - Log de todas as mensagens
4. **broadcast_campaigns** - Campanhas de disparo
5. **broadcast_recipients** - Recipientes das campanhas
6. **automations** - Automações de fluxo

### Migration para Produção:

```bash
# Executar migrations
psql -U postgres -d whatsapp_saas_db_prod -f database.sql
psql -U postgres -d whatsapp_saas_db_prod -f migrations/003-disparos-tables.sql
```

---

## 4️⃣ **JWT** (Autenticação - Futuro)

### Chave JWT para Tokens:

```env
# .env
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRATION=24h
JWT_ALGORITHM=HS256
```

### Gerar Chave Segura:

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Exemplo:
```env
JWT_SECRET=a7f9e2b1c3d5e7f9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f
```

---

## 5️⃣ **WEBHOOK URLs** (Para Receber Notificações)

### Configuração para Produção:

```env
# Seu domínio em produção
WEBHOOK_URL=https://seu-dominio-producao.com/webhooks

# Evolution Webhook
EVOLUTION_WEBHOOK_URL=https://seu-dominio-producao.com/webhooks/evolution

# Zernio Webhook
ZERNIO_WEBHOOK_URL=https://seu-dominio-producao.com/webhooks/zernio

# Webhook Secret (para validar origem)
WEBHOOK_SECRET=seu_webhook_secret_seguro
```

### Tipos de Notificações que Receberemos:

**Evolution API:**
- `message.received` - Mensagem recebida
- `message.status` - Status da mensagem (entregue, lido)
- `connection.status` - Status de conexão QR Code

**Zernio API:**
- `message.status_update` - Atualização de status
- `message.received` - Mensagem entrante
- `webhook.verified` - Verificação de webhook

---

## 🔐 **VARIÁVEIS DE AMBIENTE COMPLETAS**

### Arquivo `.env` para Desenvolvimento:

```env
# ============================================
# DATABASE
# ============================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_saas_db
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres_aqui

# ============================================
# ZERNIO API (Official WhatsApp)
# ============================================
ZERNIO_API_KEY=sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4
ZERNIO_BASE_URL=https://zernio.com/api/v1

# ============================================
# EVOLUTION API (QR Code WhatsApp)
# ============================================
EVOLUTION_API_BASE_URL=https://api.evolution.com.br
EVOLUTION_API_KEY=your_evolution_api_key_here
EVOLUTION_INSTANCE_NAME=VortexDefault
EVOLUTION_WEBHOOK_URL=http://localhost:3000/webhooks/evolution

# ============================================
# SERVER
# ============================================
PORT=3000
NODE_ENV=development

# ============================================
# JWT (Autenticação)
# ============================================
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h
JWT_ALGORITHM=HS256

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=http://localhost:5173

# ============================================
# WEBHOOKS
# ============================================
WEBHOOK_URL=http://localhost:3000/webhooks
WEBHOOK_SECRET=your_webhook_secret_here
```

### Arquivo `.env` para Produção:

```env
# ============================================
# DATABASE (AWS RDS Example)
# ============================================
DB_HOST=whatsapp-saas-prod.xxxxx.rds.amazonaws.com
DB_PORT=5432
DB_NAME=whatsapp_saas_db_prod
DB_USER=admin
DB_PASSWORD=SecurePasswordHere123!@#

# ============================================
# ZERNIO API
# ============================================
ZERNIO_API_KEY=sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4
ZERNIO_BASE_URL=https://zernio.com/api/v1

# ============================================
# EVOLUTION API
# ============================================
EVOLUTION_API_BASE_URL=https://api.evolution.com.br
EVOLUTION_API_KEY=sk_your_prod_evolution_key_here
EVOLUTION_INSTANCE_NAME=VortexProduction
EVOLUTION_WEBHOOK_URL=https://seu-dominio-producao.com/webhooks/evolution

# ============================================
# SERVER
# ============================================
PORT=3000
NODE_ENV=production

# ============================================
# JWT
# ============================================
JWT_SECRET=a7f9e2b1c3d5e7f9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f
JWT_EXPIRATION=24h
JWT_ALGORITHM=HS256

# ============================================
# FRONTEND
# ============================================
FRONTEND_URL=https://seu-dominio-producao.com

# ============================================
# WEBHOOKS
# ============================================
WEBHOOK_URL=https://seu-dominio-producao.com/webhooks
WEBHOOK_SECRET=your_prod_webhook_secret_here
```

---

## 🧪 **COMO TESTAR AS CHAVES**

### 1. Testar Zernio API:

```bash
curl -X GET https://zernio.com/api/v1/profiles \
  -H "Authorization: Bearer sk_d175f2a4d7a21b064ea0bbc3c74da34ea840996d4c3e28a9861f2a9ae3bb5ef4" \
  -H "Content-Type: application/json"
```

### 2. Testar Evolution API:

```bash
curl -X GET https://api.evolution.com.br/instances \
  -H "Authorization: Bearer your_evolution_api_key" \
  -H "Content-Type: application/json"
```

### 3. Testar Database:

```bash
psql -h localhost -U postgres -d whatsapp_saas_db -c "SELECT COUNT(*) FROM users;"
```

### 4. Testar Backend:

```bash
curl http://localhost:3000/api/health
```

---

## 📊 **RESUMO DAS CHAVES NECESSÁRIAS**

| API | Chave | Status | Prioridade |
|-----|-------|--------|-----------|
| **Zernio** | API Key | ✅ Já tem | 🔴 Alta |
| **Evolution** | API Key | ⏳ Precisa gerar | 🔴 Alta |
| **Database** | Credenciais | ✅ Já tem | 🔴 Alta |
| **JWT** | Secret | ⏳ Gerar (futuro) | 🟡 Média |
| **Webhooks** | URLs | ⏳ Configurar prod | 🟡 Média |

---

## 🚀 **PRÓXIMOS PASSOS**

### Imediato (Hoje):
1. ✅ Zernio API - Chaves já configuradas
2. ⏳ Evolution API - Obter API key no site
3. ✅ Database - Já migrado e pronto

### Curto Prazo (Esta semana):
1. Integrar Evolution API real
2. Restaurar rotas Zernio (axios)
3. Testar ambos os métodos
4. Configurar webhooks

### Médio Prazo (2-4 semanas):
1. Deploy em staging
2. Configurar HTTPS/SSL
3. Setup de monitoramento
4. Testes de carga

---

## 📝 **ARQUIVO .env FINAL**

Salve este arquivo como `.env` na raiz do projeto:

```
Arquivo: /tmp/vortex-backend/.env
Permissões: 600 (privado)
Nunca commitar ao Git!
```

---

**Status:** ✅ Chaves configuradas e documentadas  
**Próximo:** Integrar Evolution API real e testar em produção
