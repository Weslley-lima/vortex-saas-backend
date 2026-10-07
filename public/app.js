// ============================================
// APP.JS - Frontend Logic para Disparos
// ============================================

const API_BASE = 'http://localhost:3000/api';

// State
const state = {
    method: 'oficial',
    phones: [],
    campaigns: [],
    currentCampaignStats: {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0
    }
};

// ============================================
// HELPERS
// ============================================

function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.innerHTML = '';
    container.appendChild(alert);

    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function setLoading(elementId, loading = true) {
    const btn = document.getElementById(elementId);
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Processando...';
    } else {
        btn.disabled = false;
        btn.innerHTML = 'Criar Campanha';
    }
}

async function apiCall(method, endpoint, body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

function updatePhoneList() {
    const container = document.getElementById('phone-list');

    if (state.phones.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">Nenhum número adicionado</p>';
        return;
    }

    container.innerHTML = state.phones.map((phone, index) => `
        <span class="phone-tag">
            ${phone}
            <button onclick="removePhone(${index})">×</button>
        </span>
    `).join('');
}

function removePhone(index) {
    state.phones.splice(index, 1);
    updatePhoneList();
}

function formatPhone(phone) {
    // Remove caracteres especiais
    const cleaned = phone.replace(/\D/g, '');

    // Validação básica: deve ter 10-15 dígitos
    if (cleaned.length < 10 || cleaned.length > 15) {
        return null;
    }

    // Adiciona + se não tiver
    return cleaned.startsWith('55') ? `+${cleaned}` : `+55${cleaned}`;
}

function formatDateTime(date) {
    if (!date) return null;
    return new Date(date).toISOString();
}

// ============================================
// HANDLERS
// ============================================

function handleMethodSelect(e) {
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    state.method = e.target.dataset.method;
}

function handleAddPhone() {
    const input = document.getElementById('phone-input');
    const phone = input.value.trim();

    if (!phone) {
        showAlert('Digite um número de telefone', 'error');
        return;
    }

    const formatted = formatPhone(phone);
    if (!formatted) {
        showAlert('Número inválido. Use formato: +55 11 99999-9999', 'error');
        return;
    }

    if (state.phones.includes(formatted)) {
        showAlert('Este número já foi adicionado', 'error');
        return;
    }

    state.phones.push(formatted);
    input.value = '';
    updatePhoneList();
    showAlert(`Número ${formatted} adicionado`, 'success');
}

async function handleCreateCampaign() {
    // Validação
    const message = document.getElementById('message').value.trim();
    const instanceId = document.getElementById('instance-id').value.trim();
    const scheduledAt = document.getElementById('scheduled-at').value;

    if (!message) {
        showAlert('Digite uma mensagem', 'error');
        return;
    }

    if (!instanceId) {
        showAlert('Informe o ID da instância', 'error');
        return;
    }

    if (state.phones.length === 0) {
        showAlert('Adicione pelo menos um número de telefone', 'error');
        return;
    }

    setLoading('btn-create-campaign', true);

    try {
        const payload = {
            user_id: 1,
            instance_id: instanceId,
            message: message,
            metodo: state.method,
            numbers: state.phones
        };

        if (scheduledAt) {
            payload.scheduled_at = formatDateTime(scheduledAt);
        }

        const result = await apiCall('POST', '/disparos/criar', payload);

        showAlert(
            `Campanha #${result.data.campaign_id} criada com sucesso! ${state.phones.length} números adicionados.`,
            'success'
        );

        // Adicionar ao histórico
        addCampaignToList({
            id: result.data.campaign_id,
            message: message,
            method: state.method,
            numbers_count: state.phones.length,
            status: result.data.status,
            created_at: new Date().toISOString()
        });

        // Limpar formulário
        document.getElementById('message').value = '';
        document.getElementById('scheduled-at').value = '';
        state.phones = [];
        updatePhoneList();

        // Carregar status da campanha automaticamente
        loadCampaignStatus(result.data.campaign_id);

    } catch (error) {
        showAlert(`Erro ao criar campanha: ${error.message}`, 'error');
    } finally {
        setLoading('btn-create-campaign', false);
    }
}

async function loadCampaignStatus(campaignId) {
    try {
        const result = await apiCall('GET', `/disparos/status/${campaignId}`);

        // Atualizar stats
        state.currentCampaignStats = {
            total: result.data.total || 0,
            sent: result.data.sent || 0,
            failed: result.data.failed || 0,
            pending: result.data.pending || 0
        };

        updateStats();

        // Polling: atualizar status a cada 5 segundos
        if (result.data.status === 'processing') {
            setTimeout(() => loadCampaignStatus(campaignId), 5000);
        }
    } catch (error) {
        console.error('Erro ao carregar status:', error);
    }
}

function addCampaignToList(campaign) {
    if (state.campaigns.length === 0 || !state.campaigns[0].id) {
        state.campaigns = [];
    }

    state.campaigns.unshift(campaign);

    renderCampaignsList();
}

function renderCampaignsList() {
    const container = document.getElementById('campaigns-list');

    if (state.campaigns.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma campanha criada ainda</p>';
        return;
    }

    container.innerHTML = state.campaigns.map(campaign => {
        const statusClass = `status-${campaign.status}`;
        const createdTime = new Date(campaign.created_at).toLocaleString('pt-BR');

        return `
            <div class="campaign-item">
                <div class="header">
                    <div>
                        <span class="id">Campanha #${campaign.id}</span>
                        <span class="method">${campaign.method.toUpperCase()}</span>
                    </div>
                    <span class="status ${statusClass}">
                        ${getStatusLabel(campaign.status)}
                    </span>
                </div>
                <p style="margin-bottom: 10px; color: #666;">
                    📝 ${campaign.message.substring(0, 80)}${campaign.message.length > 80 ? '...' : ''}
                </p>
                <p style="margin-bottom: 10px; font-size: 0.9em; color: #999;">
                    📅 ${createdTime} • 📱 ${campaign.numbers_count} números
                </p>
                <div class="campaign-details">
                    <div class="campaign-detail">
                        <div class="label">Enviadas</div>
                        <div class="value">${campaign.sent || 0}</div>
                    </div>
                    <div class="campaign-detail">
                        <div class="label">Falhas</div>
                        <div class="value">${campaign.failed || 0}</div>
                    </div>
                    <div class="campaign-detail">
                        <div class="label">Pendentes</div>
                        <div class="value">${campaign.pending || 0}</div>
                    </div>
                    <div class="campaign-detail">
                        <div class="label">Total</div>
                        <div class="value">${campaign.total || campaign.numbers_count}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusLabel(status) {
    const labels = {
        'pending': '⏳ Pendente',
        'scheduled': '📅 Agendada',
        'processing': '⏳ Processando',
        'completed': '✅ Concluída',
        'failed': '❌ Falhou'
    };
    return labels[status] || status;
}

function updateStats() {
    document.getElementById('stat-total').textContent = state.currentCampaignStats.total;
    document.getElementById('stat-sent').textContent = state.currentCampaignStats.sent;
    document.getElementById('stat-failed').textContent = state.currentCampaignStats.failed;
    document.getElementById('stat-pending').textContent = state.currentCampaignStats.pending;
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Method selector
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', handleMethodSelect);
    });

    // Phone input
    document.getElementById('btn-add-phone').addEventListener('click', handleAddPhone);
    document.getElementById('phone-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAddPhone();
    });

    // Create campaign
    document.getElementById('btn-create-campaign').addEventListener('click', handleCreateCampaign);

    // Test connection on load
    testConnection();

    // Update phone list
    updatePhoneList();
    updateStats();
});

async function testConnection() {
    try {
        const result = await apiCall('POST', '/zernio/test');
        if (result.status === 'connected') {
            console.log('✅ Conectado ao backend Zernio');
            showAlert('✅ Conectado ao Zernio API com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao conectar:', error);
        showAlert('⚠️ Erro ao conectar com o backend. Certifique-se que o servidor está rodando.', 'error');
    }
}

// ============================================
// EXPORT para debugging
// ============================================
window.app = {
    state,
    testConnection,
    loadCampaignStatus,
    apiCall
};
