# 🚀 Vortex WhatsApp SaaS - API Endpoints Documentation

## Overview

Documentação completa de todos os endpoints da API backend do Vortex Mídia Ads. A API segue a estrutura RESTful com padrão de respostas JSON.

**Base URL:** `https://vortex-saas-backend-production.up.railway.app/api`

---

## 📋 Índice de Endpoints

1. [Health Check](#health-check)
2. [Autenticação (Auth)](#autenticação-auth)
3. [Dashboard](#dashboard)
4. [Instâncias (Zernio)](#instâncias-zernio)
5. [Automações](#automações)
6. [Contatos](#contatos)
7. [Mensagens](#mensagens)

---

## Health Check

### GET /api/health
**Descrição:** Verifica se o servidor está online

**Requisição:**
```
GET /api/health
```

**Resposta (200):**
```json
{
    "status": "ok",
    "message": "Servidor WhatsApp SaaS está funcionando! 🚀",
    "timestamp": "2026-10-06T23:30:00.000Z"
}
```

---

## Autenticação (Auth)

### POST /api/auth/register
**Descrição:** Registra um novo usuário

**Requisição:**
```json
{
    "email": "user@example.com",
    "password": "senha123",
    "name": "João Silva"
}
```

**Resposta (201):**
```json
{
    "message": "Usuário registrado com sucesso!",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "João Silva",
        "status": "active",
        "created_at": "2026-10-06T23:30:00.000Z"
    },
    "authToken": "a3f7b2c9d8e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9"
}
```

**Errors:**
- `400` - email, password ou name ausentes
- `409` - Email já registrado

---

### POST /api/auth/login
**Descrição:** Autentica um usuário e retorna token

**Requisição:**
```json
{
    "email": "user@example.com",
    "password": "senha123"
}
```

**Resposta (200):**
```json
{
    "message": "Login realizado com sucesso!",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "João Silva",
        "status": "active"
    },
    "authToken": "a3f7b2c9d8e1f4a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9"
}
```

**Errors:**
- `400` - email ou password ausentes
- `401` - Email ou senha incorretos

---

### GET /api/auth/profile
**Descrição:** Obtém perfil do usuário autenticado

**Headers:**
```
Authorization: Bearer <authToken>
```

**Resposta (200):**
```json
{
    "message": "Perfil obtido com sucesso",
    "profile": {
        "id": 1,
        "email": "user@example.com",
        "name": "Usuário Exemplo",
        "status": "active",
        "plan": "Professional",
        "created_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

## Dashboard

### GET /api/dashboard/:user_id
**Descrição:** Obtém estatísticas e dados agregados do dashboard

**Parâmetros:**
- `user_id` - ID do usuário

**Resposta (200):**
```json
{
    "message": "Dashboard obtido com sucesso",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "name": "João Silva",
        "status": "active",
        "created_at": "2026-10-06T23:30:00.000Z"
    },
    "statistics": {
        "instances": {
            "total": 5,
            "active": 3,
            "connecting": 1,
            "pending": 1
        },
        "contacts": {
            "total": 250
        },
        "automations": {
            "total": 12,
            "active": 10,
            "paused": 2
        },
        "messages": {
            "total": 1543,
            "incoming": 789,
            "outgoing": 754,
            "period": "30 dias"
        }
    },
    "recentInstances": [
        {
            "id": 1,
            "instance_name": "Instância Principal",
            "phone_number": "5511999999999",
            "status": "active",
            "created_at": "2026-10-06T23:30:00.000Z"
        }
    ]
}
```

**Errors:**
- `404` - Usuário não encontrado

---

## Instâncias (Zernio)

### POST /api/instances/create
**Descrição:** Cria uma nova instância WhatsApp via Zernio

**Requisição:**
```json
{
    "instance_name": "Minha Primeira Instância",
    "user_id": 1
}
```

**Resposta (201):**
```json
{
    "message": "Instância criada com sucesso!",
    "instance": {
        "id": 1,
        "user_id": 1,
        "zernio_profile_id": "prof_abc123def456",
        "instance_name": "Minha Primeira Instância",
        "status": "pending",
        "created_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### POST /api/instances/connect
**Descrição:** Obtém URL de autenticação WhatsApp (QR Code)

**Requisição:**
```json
{
    "zernio_profile_id": "prof_abc123def456"
}
```

**Resposta (200):**
```json
{
    "message": "URL de autenticação obtida com sucesso!",
    "authUrl": "https://api.zernio.com/auth/whatsapp/prof_abc123def456",
    "instance": {
        "id": 1,
        "instance_name": "Minha Primeira Instância",
        "status": "connecting",
        "updated_at": "2026-10-06T23:30:00.000Z"
    },
    "instructions": "Abra a authUrl em um navegador ou pop-up para autenticar com sua conta WhatsApp Business"
}
```

---

### GET /api/instances
**Descrição:** Lista todas as instâncias de um usuário

**Query Parameters:**
- `user_id` - ID do usuário (obrigatório)

**Resposta (200):**
```json
{
    "message": "Instâncias listadas com sucesso",
    "total": 3,
    "instances": [
        {
            "id": 1,
            "user_id": 1,
            "zernio_profile_id": "prof_abc123def456",
            "instance_name": "Instância Principal",
            "phone_number": "5511999999999",
            "status": "active",
            "created_at": "2026-10-06T23:30:00.000Z",
            "updated_at": "2026-10-06T23:30:00.000Z"
        }
    ]
}
```

---

### GET /api/instances/:zernio_profile_id
**Descrição:** Obtém detalhes de uma instância

**Parâmetros:**
- `zernio_profile_id` - ID do perfil Zernio

**Resposta (200):**
```json
{
    "message": "Instância obtida com sucesso",
    "instance": {
        "id": 1,
        "user_id": 1,
        "zernio_profile_id": "prof_abc123def456",
        "instance_name": "Instância Principal",
        "phone_number": "5511999999999",
        "status": "active",
        "metadata": {...},
        "created_at": "2026-10-06T23:30:00.000Z",
        "updated_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

## Automações

### POST /api/automations
**Descrição:** Cria uma nova automação/flow

**Requisição:**
```json
{
    "user_id": 1,
    "automation_name": "Saudação Automática",
    "trigger_type": "message_received",
    "action_type": "send_message",
    "flow_data": {
        "response": "Olá! Bem-vindo ao Vortex!"
    }
}
```

**Resposta (201):**
```json
{
    "message": "Automação criada com sucesso!",
    "automation": {
        "id": 1,
        "user_id": 1,
        "automation_name": "Saudação Automática",
        "trigger_type": "message_received",
        "action_type": "send_message",
        "status": "active",
        "created_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### GET /api/automations
**Descrição:** Lista todas as automações de um usuário

**Query Parameters:**
- `user_id` - ID do usuário (obrigatório)

**Resposta (200):**
```json
{
    "message": "Automações listadas com sucesso",
    "total": 5,
    "automations": [
        {
            "id": 1,
            "user_id": 1,
            "automation_name": "Saudação Automática",
            "trigger_type": "message_received",
            "action_type": "send_message",
            "status": "active",
            "created_at": "2026-10-06T23:30:00.000Z",
            "updated_at": "2026-10-06T23:30:00.000Z"
        }
    ]
}
```

---

### GET /api/automations/:automation_id
**Descrição:** Obtém detalhes de uma automação

**Parâmetros:**
- `automation_id` - ID da automação

**Resposta (200):**
```json
{
    "message": "Automação obtida com sucesso",
    "automation": {
        "id": 1,
        "user_id": 1,
        "automation_name": "Saudação Automática",
        "trigger_type": "message_received",
        "action_type": "send_message",
        "flow_data": {...},
        "status": "active",
        "created_at": "2026-10-06T23:30:00.000Z",
        "updated_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### PUT /api/automations/:automation_id
**Descrição:** Atualiza uma automação

**Requisição:**
```json
{
    "automation_name": "Novo Nome",
    "status": "paused"
}
```

**Resposta (200):**
```json
{
    "message": "Automação atualizada com sucesso",
    "automation": {
        "id": 1,
        "automation_name": "Novo Nome",
        "status": "paused",
        "updated_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### DELETE /api/automations/:automation_id
**Descrição:** Deleta uma automação

**Resposta (200):**
```json
{
    "message": "Automação deletada com sucesso",
    "automation": {
        "id": 1,
        "automation_name": "Saudação Automática"
    }
}
```

---

## Contatos

### POST /api/contacts
**Descrição:** Cria um novo contato

**Requisição:**
```json
{
    "user_id": 1,
    "phone_number": "5511999999999",
    "contact_name": "João Silva",
    "email": "joao@example.com"
}
```

**Resposta (201):**
```json
{
    "message": "Contato criado com sucesso!",
    "contact": {
        "id": 1,
        "user_id": 1,
        "phone_number": "5511999999999",
        "contact_name": "João Silva",
        "email": "joao@example.com",
        "status": "active",
        "created_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### GET /api/contacts
**Descrição:** Lista todos os contatos de um usuário

**Query Parameters:**
- `user_id` - ID do usuário (obrigatório)

**Resposta (200):**
```json
{
    "message": "Contatos listados com sucesso",
    "total": 250,
    "contacts": [
        {
            "id": 1,
            "user_id": 1,
            "phone_number": "5511999999999",
            "contact_name": "João Silva",
            "email": "joao@example.com",
            "status": "active",
            "last_message_at": "2026-10-06T23:30:00.000Z",
            "created_at": "2026-10-06T23:30:00.000Z",
            "updated_at": "2026-10-06T23:30:00.000Z"
        }
    ]
}
```

---

### GET /api/contacts/:contact_id
**Descrição:** Obtém detalhes de um contato

**Parâmetros:**
- `contact_id` - ID do contato

**Resposta (200):**
```json
{
    "message": "Contato obtido com sucesso",
    "contact": {
        "id": 1,
        "user_id": 1,
        "phone_number": "5511999999999",
        "contact_name": "João Silva",
        "email": "joao@example.com",
        "status": "active",
        "last_message_at": "2026-10-06T23:30:00.000Z",
        "metadata": {...},
        "created_at": "2026-10-06T23:30:00.000Z",
        "updated_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### PUT /api/contacts/:contact_id
**Descrição:** Atualiza um contato

**Requisição:**
```json
{
    "contact_name": "João Silva Atualizado",
    "email": "newemail@example.com",
    "status": "active"
}
```

**Resposta (200):**
```json
{
    "message": "Contato atualizado com sucesso",
    "contact": {
        "id": 1,
        "phone_number": "5511999999999",
        "contact_name": "João Silva Atualizado",
        "email": "newemail@example.com",
        "status": "active",
        "updated_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### DELETE /api/contacts/:contact_id
**Descrição:** Deleta um contato

**Resposta (200):**
```json
{
    "message": "Contato deletado com sucesso",
    "contact": {
        "id": 1,
        "contact_name": "João Silva",
        "phone_number": "5511999999999"
    }
}
```

---

## Mensagens

### POST /api/messages/send
**Descrição:** Envia uma mensagem WhatsApp via Zernio

**Requisição:**
```json
{
    "user_id": 1,
    "zernio_profile_id": "prof_abc123def456",
    "phone_number": "5511999999999",
    "message_text": "Olá! Como posso ajudar?"
}
```

**Resposta (201):**
```json
{
    "message": "Mensagem enviada com sucesso!",
    "messageLog": {
        "id": 1,
        "user_id": 1,
        "phone_number": "5511999999999",
        "message_text": "Olá! Como posso ajudar?",
        "direction": "outgoing",
        "status": "sent",
        "created_at": "2026-10-06T23:30:00.000Z"
    },
    "zernio_message_id": "msg_abc123def456"
}
```

---

### GET /api/messages
**Descrição:** Lista mensagens de um usuário

**Query Parameters:**
- `user_id` - ID do usuário (obrigatório)
- `phone_number` - Filtrar por número de telefone (opcional)
- `zernio_profile_id` - Filtrar por instância (opcional)

**Resposta (200):**
```json
{
    "message": "Mensagens listadas com sucesso",
    "total": 50,
    "messages": [
        {
            "id": 1,
            "user_id": 1,
            "phone_number": "5511999999999",
            "message_text": "Olá!",
            "direction": "incoming",
            "status": "received",
            "created_at": "2026-10-06T23:30:00.000Z"
        }
    ]
}
```

---

### GET /api/messages/:message_id
**Descrição:** Obtém detalhes de uma mensagem

**Parâmetros:**
- `message_id` - ID da mensagem

**Resposta (200):**
```json
{
    "message": "Mensagem obtida com sucesso",
    "messageLog": {
        "id": 1,
        "user_id": 1,
        "zernio_profile_id": "prof_abc123def456",
        "phone_number": "5511999999999",
        "message_text": "Olá!",
        "direction": "incoming",
        "status": "received",
        "zernio_message_id": "msg_abc123def456",
        "created_at": "2026-10-06T23:30:00.000Z",
        "updated_at": "2026-10-06T23:30:00.000Z"
    }
}
```

---

### GET /api/messages/conversation/:phone_number
**Descrição:** Obtém histórico de conversa com um contato

**Query Parameters:**
- `user_id` - ID do usuário (obrigatório)

**Parâmetros:**
- `phone_number` - Número de telefone do contato

**Resposta (200):**
```json
{
    "message": "Conversa carregada com sucesso",
    "phone_number": "5511999999999",
    "total": 25,
    "messages": [
        {
            "id": 1,
            "phone_number": "5511999999999",
            "message_text": "Olá!",
            "direction": "incoming",
            "status": "received",
            "created_at": "2026-10-06T23:30:00.000Z"
        }
    ]
}
```

---

## Status Codes

| Código | Descrição |
|--------|-----------|
| 200 | OK - Sucesso |
| 201 | Created - Recurso criado |
| 400 | Bad Request - Erro na requisição |
| 401 | Unauthorized - Não autenticado |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito (ex: duplicata) |
| 500 | Internal Server Error - Erro do servidor |

---

## Exemplos de Uso com cURL

### Login
```bash
curl -X POST https://vortex-saas-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "senha123"
  }'
```

### Criar Instância
```bash
curl -X POST https://vortex-saas-backend-production.up.railway.app/api/instances/create \
  -H "Content-Type: application/json" \
  -d '{
    "instance_name": "Minha Instância",
    "user_id": 1
  }'
```

### Enviar Mensagem
```bash
curl -X POST https://vortex-saas-backend-production.up.railway.app/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "zernio_profile_id": "prof_abc123",
    "phone_number": "5511999999999",
    "message_text": "Olá!"
  }'
```

### Obter Dashboard
```bash
curl -X GET https://vortex-saas-backend-production.up.railway.app/api/dashboard/1
```

---

## Notas Importantes

1. **Autenticação**: A maioria dos endpoints requer um `user_id` válido
2. **Zernio API**: A integração com WhatsApp depende de credenciais válidas da Zernio
3. **Banco de Dados**: Certifique-se de que o PostgreSQL está configurado corretamente
4. **Rate Limiting**: Implemente rate limiting em produção
5. **Segurança**: Use HTTPS em produção e valide todos os inputs

---

**Última atualização:** 6 de outubro de 2026
**Versão API:** 1.0.0
