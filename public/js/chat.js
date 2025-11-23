// Chat functionality with Supabase Realtime
let supabaseClient = null;
let messagesSubscription = null;
let presenceSubscription = null;
let heartbeatInterval = null;

// Initialize Supabase client
function initializeSupabaseClient() {
    const supabaseUrl = 'https://hamxnydorrdoeqzxrnew.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbXhueWRvcnJkb2VxenhybmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MDYyODIsImV4cCI6MjA3OTA4MjI4Mn0.fmijy6E_bdQmlaT4Dx8u9YKwEbIdYFQ5MZWxQ2n3gvo';

    supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized for chat');
}

// Initialize chat
async function initializeChat() {
    try {
        initializeSupabaseClient();

        // Setup event listeners
        setupChatEventListeners();

        // Mark user as online
        await markUserOnline();

        // Load initial data
        await loadChatMessages();
        await loadOnlineUsers();

        // Subscribe to realtime updates
        subscribeToMessages();
        subscribeToPresence();

        // Start heartbeat
        startHeartbeat();

        console.log('Chat initialized successfully');
    } catch (error) {
        console.error('Error initializing chat:', error);
    }
}

// Setup event listeners
function setupChatEventListeners() {
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('messageInput');

    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', toggleChat);
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', toggleChat);
    }

    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
}

// Toggle chat panel
function toggleChat() {
    const chatPanel = document.getElementById('chatPanel');
    const chatToggleBtn = document.getElementById('chatToggleBtn');

    if (chatPanel.classList.contains('hidden')) {
        chatPanel.classList.remove('hidden');
        chatToggleBtn.classList.add('hidden');
        scrollToBottom();
    } else {
        chatPanel.classList.add('hidden');
        chatToggleBtn.classList.remove('hidden');
    }
}

// Send message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const mensaje = messageInput.value.trim();

    if (!mensaje) return;

    try {
        await API.post('/chat/messages', { mensaje });
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error al enviar mensaje', 'error');
    }
}

// Load chat messages
async function loadChatMessages() {
    try {
        const messages = await API.get('/chat/messages'); // API.get already returns the data
        renderMessages(messages || []);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render messages
function renderMessages(messages) {
    const messagesArea = document.getElementById('messagesArea');
    if (!messagesArea) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    messagesArea.innerHTML = messages.map(msg => {
        const isOwnMessage = msg.usuario_id === user.id;
        const time = new Date(msg.created_at).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="flex ${isOwnMessage ? 'justify-end' : 'justify-start'}">
                <div class="max-w-xs ${isOwnMessage ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg px-4 py-2">
                    ${!isOwnMessage ? `<p class="text-xs font-semibold mb-1">${msg.nombre_usuario}</p>` : ''}
                    <p class="text-sm">${escapeHtml(msg.mensaje)}</p>
                    <p class="text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'} mt-1">${time}</p>
                </div>
            </div>
        `;
    }).join('');

    scrollToBottom();
}

// Load online users
async function loadOnlineUsers() {
    try {
        const users = await API.get('/chat/presence'); // API.get already returns the data
        console.log('Users from API:', users);
        renderOnlineUsers(users || []);
    } catch (error) {
        console.error('Error loading online users:', error);
    }
}

// Render online users
function renderOnlineUsers(users) {
    const onlineUsersList = document.getElementById('onlineUsersList');
    const onlineCount = document.getElementById('onlineCount');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('=== RENDER ONLINE USERS DEBUG ===');
    console.log('All users received:', JSON.stringify(users, null, 2));
    console.log('Current user:', currentUser);

    if (!onlineUsersList || !onlineCount) {
        console.error('Online users elements not found!');
        return;
    }

    // Show ALL users for now (remove filter to debug)
    const onlineUsers = users; // Changed: showing all users
    console.log('Users to display:', onlineUsers.length);

    onlineCount.textContent = `${onlineUsers.length} total`; // Changed: showing total count for debugging

    if (onlineUsers.length === 0) {
        onlineUsersList.innerHTML = '<span class="text-xs text-gray-500">No hay usuarios conectados</span>';
        return;
    }

    onlineUsersList.innerHTML = onlineUsers.map(user => {
        const isCurrentUser = user.usuario_id === currentUser.id;
        const isCheckedIn = user.check_in_status === 'conectado';
        const isOnline = user.estado === 'online';

        console.log(`User: ${user.nombre_completo}, online: ${isOnline}, checked in: ${isCheckedIn}`);

        return `
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs ${isCurrentUser
                ? 'bg-indigo-100 text-indigo-800'
                : isCheckedIn
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
            }">
                <span class="w-2 h-2 ${isCheckedIn ? 'bg-green-500' : 'bg-gray-400'} rounded-full mr-1"></span>
                ${user.nombre_completo}${isCurrentUser ? ' (tú)' : ''}
            </span>
        `;
    }).join('');
}

// Subscribe to new messages
function subscribeToMessages() {
    if (!supabaseClient) return;

    messagesSubscription = supabaseClient
        .channel('mensajes_chat_changes')
        .on('postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'mensajes_chat' },
            (payload) => {
                console.log('New message received:', payload);
                appendMessage(payload.new);
            }
        )
        .subscribe();
}

// Subscribe to presence changes
function subscribeToPresence() {
    if (!supabaseClient) return;

    presenceSubscription = supabaseClient
        .channel('presencia_usuarios_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'presencia_usuarios' },
            (payload) => {
                console.log('Presence changed:', payload);
                loadOnlineUsers();
            }
        )
        .subscribe();
}

// Append new message to chat
function appendMessage(message) {
    const messagesArea = document.getElementById('messagesArea');
    if (!messagesArea) return;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isOwnMessage = message.usuario_id === user.id;
    const time = new Date(message.created_at).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageElement = document.createElement('div');
    messageElement.className = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
    messageElement.innerHTML = `
        <div class="max-w-xs ${isOwnMessage ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg px-4 py-2">
            ${!isOwnMessage ? `<p class="text-xs font-semibold mb-1">${message.nombre_usuario}</p>` : ''}
            <p class="text-sm">${escapeHtml(message.mensaje)}</p>
            <p class="text-xs ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'} mt-1">${time}</p>
        </div>
    `;

    messagesArea.appendChild(messageElement);
    scrollToBottom();
}

// Mark user as online
async function markUserOnline() {
    try {
        await API.post('/chat/presence/online');
    } catch (error) {
        console.error('Error marking user online:', error);
    }
}

// Mark user as offline
async function markUserOffline() {
    try {
        await API.post('/chat/presence/offline');
    } catch (error) {
        console.error('Error marking user offline:', error);
    }
}

// Start heartbeat to keep user online
function startHeartbeat() {
    // Send heartbeat every 30 seconds
    heartbeatInterval = setInterval(async () => {
        try {
            await API.post('/chat/presence/heartbeat');
        } catch (error) {
            console.error('Heartbeat error:', error);
        }
    }, 30000);
}

// Stop heartbeat
function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// Cleanup chat on logout
async function cleanupChat() {
    try {
        await markUserOffline();
        stopHeartbeat();

        if (messagesSubscription) {
            supabaseClient.removeChannel(messagesSubscription);
        }
        if (presenceSubscription) {
            supabaseClient.removeChannel(presenceSubscription);
        }
    } catch (error) {
        console.error('Error cleaning up chat:', error);
    }
}

// Scroll to bottom of messages
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize chat when user logs in
window.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
        setTimeout(() => {
            initializeChat();
        }, 1000);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    cleanupChat();
});
