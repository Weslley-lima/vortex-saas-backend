# Disparos & Evolution API - Documentação

## 🚀 Novo Stack Implementado

### 1. Evolution API (QR Code)
- Conectar WhatsApp via QR Code (sem custos)
- Enviar mensagens sem aprovação oficial
- Ideal para testes e usuários não comerciais

### 2. Disparos em Massa (Oficial + QR)
- Criar campanhas de disparo
- Suportar Zernio (oficial) e Evolution (QR)
- Fila automática de processamento
- Rastreamento de status em tempo real

### 3. Queue Processor
- Sistema de fila automática
- Processa campanhas pendentes a cada 5 segundos
- Suporta até 100 números por ciclo
- Registra status de cada mensagem

---

## 📡 Endpoints da Evolution API

### 1. Gerar QR Code
**POST** `/api/evolution/qrcode`

```json
{
  "user_id": 1,
  "instance_name": "Minha Instância QR"
}
```

**Response:**
```json
{
  "message": "QR Code gerado com sucesso",
  "data": {
    "qr_code": "data:image/png;base64,...",
    "instance_id": "qr_1633025600000",
    "expires_in": 60,
    "status": "pending"
  }
}
```

### 2. Obter Status da Instância
**GET** `/api/evolution/status/:instance_id`

**Response:**
```json
{
  "message": "Status da instância",
  "data": {
    "instance_id": "1",
    "name": "Minha Instância QR",
    "status": "connecting",
    "type": "qrcode"
  }
}
```

### 3. Enviar Mensagem via QR
**POST** `/api/evolution/send`

```json
{
  "instance_id": "1",
  "phone_number": "+55 11 99999-9999",
  "message": "Olá! Essa é uma mensagem via QR Code"
}
```

**Response:**
```json
{
  "message": "Mensagem enviada com sucesso",
  "data": {
    "message_id": "msg_1633025600000",
    "status": "sent",
    "sent_at": "2026-10-07T00:15:00Z"
  }
}
```

---

## 📤 Endpoints de Disparos

### 1. Criar Campanha
**POST** `/api/disparos/criar`

```json
{
  "user_id": 1,
  "instance_id": "1",
  "message": "Olá! Essa é uma mensagem em massa",
  "metodo": "oficial",
  "numbers": [
    "+55 11 99999-0001",
    "+55 11 99999-0002",
    "+55 11 99999-0003"
  ],
  "scheduled_at": null
}
```

**Parâmetros:**
- `metodo`: "oficial" (Zernio) ou "qrcode" (Evolution)
- `numbers`: Array de números (máx 1000 recomendado)
- `scheduled_at`: Data/hora para disparo agendado (opcional)

**Response:**
```json
{
  "message": "Campanha criada com sucesso",
  "data": {
    "campaign_id": 1,
    "total_numbers": 3,
    "method": "oficial",
    "status": "pending",
    "scheduled_at": null
  }
}
```

### 2. Enviar Campanha
**POST** `/api/disparos/enviar`

```json
{
  "campaign_id": 1,
  "metodo": "oficial"
}
```

**Response:**
```json
{
  "message": "Disparos iniciados",
  "data": {
    "campaign_id": 1,
    "total": 3,
    "sent": 3,
    "failed": 0,
    "status": "processing"
  }
}
```

### 3. Obter Status da Campanha
**GET** `/api/disparos/status/:campaign_id`

**Response:**
```json
{
  "message": "Status da campanha",
  "data": {
    "campaign_id": 1,
    "status": "completed",
    "method": "oficial",
    "total": 3,
    "sent": 3,
    "failed": 0,
    "pending": 0,
    "created_at": "2026-10-07T00:00:00Z",
    "scheduled_at": null
  }
}
```

---

## 🔄 Fluxo Completo de Disparo

### 1. Usuário escolhe método (Frontend)
```
[Oficial] ou [QR Code]
```

### 2. Usuário carrega números
```
Via planilha CSV ou campo de texto
```

### 3. Sistema cria campanha
```
POST /api/disparos/criar
```

### 4. Sistema enfileira disparo
```
POST /api/disparos/enviar
```

### 5. Queue Processor processa automaticamente
```
- A cada 5 segundos
- Busca campanhas pendentes
- Envia em lotes de 100
- Registra status de cada mensagem
```

### 6. Usuário monitora progresso
```
GET /api/disparos/status/:campaign_id
```

---

## 🗄️ Tabelas do Banco de Dados

### broadcast_campaigns
```sql
- id: INT (PRIMARY KEY)
- user_id: INT (FOREIGN KEY)
- instance_id: VARCHAR (FOREIGN KEY)
- message: TEXT
- method: VARCHAR (oficial|qrcode)
- total_numbers: INT
- sent_count: INT
- failed_count: INT
- status: VARCHAR (pending|scheduled|processing|completed|failed)
- scheduled_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### broadcast_recipients
```sql
- id: INT (PRIMARY KEY)
- campaign_id: INT (FOREIGN KEY)
- phone_number: VARCHAR
- status: VARCHAR (pending|sent|failed|skipped)
- error_message: TEXT
- sent_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

---

## ⚙️ Configuração

### Environment Variables
```env
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua_chave_aqui
```

### Queue Processor
O processador roda automaticamente quando o servidor inicia:
```javascript
const queueProcessor = new QueueProcessor(pool);
queueProcessor.start(5000); // Processa a cada 5 segundos
```

---

## 📊 Monitoramento

### Log de processamento
```
✅ Queue processor iniciado - Intervalo: 5 s
📤 Processando campanha: 1
📨 Enviando para +55 11 99999-0001 via oficial
📨 Enviando para +55 11 99999-0002 via oficial
✅ Campanha 1 completada!
```

---

## 🔗 Próximos Passos

1. **Integrar com Evolution API Real**
   - Substituir chamadas simuladas por chamadas reais
   - Implementar geração de QR Code

2. **Integrar Google Sheets**
   - Ler números direto de planilha
   - Atualizar status na planilha

3. **Webhooks**
   - Receber confirmações de entrega
   - Receber mensagens de entrada

4. **Rate Limiting**
   - Limitar disparos por usuário
   - Evitar blacklist do WhatsApp

