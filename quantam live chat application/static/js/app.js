// --- Application State ---
let socket = null;
let myUsername = "";
let myRoom = "";
let currentKeyDetails = null;
let cryptoKey = null; // SubtleCrypto CryptoKey object
const messageStore = {}; // Stores cryptographic details for inspection
let bitStreamInterval = null; // Animation interval for binary matrix

// --- DOM Elements ---
const landingScreen = document.getElementById("landing-screen");
const chatDashboard = document.getElementById("chat-dashboard");
const joinForm = document.getElementById("join-form");
const usernameInput = document.getElementById("username");
const roomIdInput = document.getElementById("room-id");

const currentRoomDisplay = document.getElementById("current-room-display");
const userCountDisplay = document.getElementById("user-count");
const userListContainer = document.getElementById("user-list");
const chatHistory = document.getElementById("chat-history");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

const btnRotateKey = document.getElementById("btn-rotate-key");
const btnLeave = document.getElementById("btn-leave");

// Quantum Inspector DOM
const circuitDiagram = document.getElementById("circuit-diagram");
const binaryStreamContainer = document.getElementById("binary-stream");
const statEntropy = document.getElementById("stat-entropy");
const statRatio = document.getElementById("stat-ratio");
const statQubits = document.getElementById("stat-qubits");
const statShots = document.getElementById("stat-shots");
const sessionKeyDisplay = document.getElementById("session-key-display");
const keyStatusIndicator = document.getElementById("key-status");
const keyStatusText = document.getElementById("key-status-text");

// Modal DOM
const cryptoModal = document.getElementById("crypto-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const modalPlaintext = document.getElementById("modal-plaintext");
const modalCiphertext = document.getElementById("modal-ciphertext");
const modalIv = document.getElementById("modal-iv");
const modalTag = document.getElementById("modal-tag");
const modalKey = document.getElementById("modal-key");

// Toast DOM
const toastNotification = document.getElementById("toast-notification");
const toastText = document.getElementById("toast-text");

// --- Web Crypto API Helpers ---

/**
 * Converts a hex string into an ArrayBuffer
 */
function hexToBuffer(hexString) {
    if (hexString.length % 2 !== 0) {
        hexString = '0' + hexString;
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes.buffer;
}

/**
 * Converts an ArrayBuffer into a hex string
 */
function bufferToHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

/**
 * Imports a raw hex-encoded AES key into a CryptoKey object (AES-GCM)
 */
async function importAESKey(hexKey) {
    const rawKey = hexToBuffer(hexKey);
    return await window.crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: "AES-GCM" },
        false, // Key is not extractable (highly secure)
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts plaintext using AES-GCM 256-bit.
 * Returns { ciphertext: base64, iv: hex, tag: hex }
 */
async function encryptMessage(key, plaintext) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(plaintext);
    
    // Generate a cryptographically secure 12-byte IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt using SubtleCrypto
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
            tagLength: 128 // 16 bytes auth tag (standard)
        },
        key,
        encodedData
    );
    
    // Web Crypto API appends the 16-byte auth tag at the end of the ciphertext buffer
    const fullEncryptedBytes = new Uint8Array(ciphertextBuffer);
    const ciphertextBytes = fullEncryptedBytes.slice(0, fullEncryptedBytes.length - 16);
    const tagBytes = fullEncryptedBytes.slice(fullEncryptedBytes.length - 16);
    
    // Convert components to transport formats
    const ciphertextBase64 = btoa(String.fromCharCode.apply(null, ciphertextBytes));
    const ivHex = bufferToHex(iv);
    const tagHex = bufferToHex(tagBytes);
    
    return {
        ciphertext: ciphertextBase64,
        iv: ivHex,
        tag: tagHex
    };
}

/**
 * Decrypts ciphertext using AES-GCM 256-bit and verified tag.
 */
async function decryptMessage(key, ciphertextBase64, ivHex, tagHex) {
    try {
        // Decode base64 ciphertext
        const ciphertextBytes = new Uint8Array(
            atob(ciphertextBase64).split("").map(c => c.charCodeAt(0))
        );
        // Decode hex IV and Tag
        const ivBytes = new Uint8Array(hexToBuffer(ivHex));
        const tagBytes = new Uint8Array(hexToBuffer(tagHex));
        
        // Reassemble Web Crypto payload: Ciphertext + Auth Tag
        const combinedPayload = new Uint8Array(ciphertextBytes.length + tagBytes.length);
        combinedPayload.set(ciphertextBytes);
        combinedPayload.set(tagBytes, ciphertextBytes.length);
        
        // Decrypt using SubtleCrypto
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: ivBytes,
                tagLength: 128
            },
            key,
            combinedPayload
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    } catch (err) {
        console.error("AES Decryption error:", err);
        return "[DECRYPTION FAILURE: Authentication failed or key mismatch]";
    }
}

// --- Dynamic Animations ---

/**
 * Creates and runs a matrix-style pulsing binary stream visualization
 */
function animateBinaryStream(binaryString) {
    if (bitStreamInterval) {
        clearInterval(bitStreamInterval);
    }
    
    binaryStreamContainer.innerHTML = "";
    
    // Create elements for each bit
    const bitElements = [];
    for (let i = 0; i < binaryString.length; i++) {
        const span = document.createElement("span");
        span.textContent = binaryString[i];
        binaryStreamContainer.appendChild(span);
        bitElements.push(span);
    }
    
    // Pulsing animation interval
    bitStreamInterval = setInterval(() => {
        // Reset old actives
        bitElements.forEach(span => {
            if (Math.random() > 0.96) {
                span.classList.add("active");
            } else if (Math.random() > 0.5) {
                span.classList.remove("active");
            }
        });
    }, 150);
}

/**
 * Shows a toast notification at the bottom
 */
function showToast(message) {
    toastText.textContent = message;
    toastNotification.classList.add("active");
    
    setTimeout(() => {
        toastNotification.classList.remove("active");
    }, 3500);
}

// --- Socket.IO Event Handlers ---

function initSocketConnection() {
    socket = io();
    
    // Key Distribution
    socket.on('key_distributed', async (data) => {
        currentKeyDetails = data.key_details;
        
        // Import raw key into Web Crypto API
        cryptoKey = await importAESKey(currentKeyDetails.key_hex);
        
        // Update Quantum Inspector Panel
        circuitDiagram.textContent = currentKeyDetails.circuit_diagram;
        sessionKeyDisplay.textContent = currentKeyDetails.key_hex;
        
        // Stats binding
        const stats = currentKeyDetails.statistics;
        statEntropy.textContent = stats.entropy.toFixed(4);
        statRatio.textContent = stats.ratio_0_1;
        statQubits.textContent = stats.qubits_used;
        statShots.textContent = stats.shots;
        
        // Trigger quantum animation
        animateBinaryStream(currentKeyDetails.binary_stream);
        
        // Update Key Status Indicators
        if (stats.source.includes("Quantum")) {
            keyStatusIndicator.classList.remove("fallback");
            keyStatusText.textContent = "Quantum Secure";
        } else {
            keyStatusIndicator.classList.add("fallback");
            keyStatusText.textContent = "Fallback Secure";
        }
        
        // Show notification toast
        if (data.system_msg) {
            showToast(data.system_msg);
            appendSystemMessage(data.system_msg);
        }
    });
    
    // User joined
    socket.on('user_joined', (data) => {
        updateUsersList(data.users);
    });
    
    // User left
    socket.on('user_left', (data) => {
        updateUsersList(data.users);
    });
    
    // System notification log
    socket.on('system_notification', (data) => {
        appendSystemMessage(data.message);
    });
    
    // Relayed Message
    socket.on('message', async (data) => {
        const sender = data.sender;
        const ciphertext = data.ciphertext;
        const iv = data.iv;
        const tag = data.tag;
        
        // Decrypt locally using imported Web Crypto AES key
        const plaintext = await decryptMessage(cryptoKey, ciphertext, iv, tag);
        
        // Store crypto metrics for inspections
        const messageId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        messageStore[messageId] = {
            plaintext: plaintext,
            ciphertext: ciphertext,
            iv: iv,
            tag: tag,
            key: currentKeyDetails.key_hex
        };
        
        appendMessage(sender, plaintext, messageId);
    });
}

// --- UI Management ---

/**
 * Handle Joining Room
 */
joinForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    myUsername = usernameInput.value.trim();
    myRoom = roomIdInput.value.trim();
    
    if (!myUsername || !myRoom) return;
    
    // Toggle screens
    landingScreen.style.display = "none";
    chatDashboard.style.display = "grid";
    
    currentRoomDisplay.textContent = myRoom;
    
    // Initialize Socket connection and join
    initSocketConnection();
    socket.emit("join", { username: myUsername, room: myRoom });
});

/**
 * Send Message
 */
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !cryptoKey) return;
    
    // Encrypt the message locally in browser before sending!
    const encrypted = await encryptMessage(cryptoKey, text);
    
    // Emit encrypted payload to server
    socket.emit("message", {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag
    });
    
    // Clear input
    messageInput.value = "";
    messageInput.focus();
});

/**
 * Rotate Session Key
 */
btnRotateKey.addEventListener("click", () => {
    if (!socket) return;
    socket.emit("rotate_key", { room: myRoom });
});

/**
 * Leave Room
 */
btnLeave.addEventListener("click", () => {
    if (!socket) return;
    socket.emit("leave");
    
    // Reset state
    if (bitStreamInterval) {
        clearInterval(bitStreamInterval);
    }
    
    socket.disconnect();
    socket = null;
    currentKeyDetails = null;
    cryptoKey = null;
    
    // UI Reset
    chatHistory.innerHTML = "";
    userListContainer.innerHTML = "";
    sessionKeyDisplay.textContent = "Uninitialized";
    circuitDiagram.textContent = "Loading Circuit...";
    binaryStreamContainer.innerHTML = "";
    
    // Toggle Screens
    chatDashboard.style.display = "none";
    landingScreen.style.display = "flex";
    
    usernameInput.value = "";
    roomIdInput.value = "";
});

/**
 * Append chat bubble
 */
function appendMessage(sender, text, messageId) {
    const isOutgoing = sender === myUsername;
    
    const wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper");
    wrapper.classList.add(isOutgoing ? "outgoing" : "incoming");
    
    // Meta (Sender + Time)
    const meta = document.createElement("div");
    meta.classList.add("message-meta");
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    meta.innerHTML = `<strong>${sender}</strong> <span>• ${timestamp}</span>`;
    wrapper.appendChild(meta);
    
    // Bubble
    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    
    // Plaintext
    const textNode = document.createElement("div");
    textNode.textContent = text;
    bubble.appendChild(textNode);
    
    // Decrypted badge click trigger
    const securityTag = document.createElement("div");
    securityTag.classList.add("security-tag");
    securityTag.innerHTML = `<i class="fa-solid fa-lock-open"></i> Decrypted (Click to inspect)`;
    securityTag.addEventListener("click", () => showCryptoModal(messageId));
    bubble.appendChild(securityTag);
    
    wrapper.appendChild(bubble);
    chatHistory.appendChild(wrapper);
    
    // Auto-scroll
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Append centered system message
 */
function appendSystemMessage(text) {
    const log = document.createElement("div");
    log.classList.add("system-log-message");
    log.textContent = text;
    chatHistory.appendChild(log);
    
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

/**
 * Rebuilds the user list
 */
function updateUsersList(users) {
    userListContainer.innerHTML = "";
    userCountDisplay.textContent = users.length;
    
    users.forEach(user => {
        const item = document.createElement("div");
        item.classList.add("user-item");
        if (user === myUsername) {
            item.classList.add("self");
        }
        
        // Status green dot
        const dot = document.createElement("div");
        dot.classList.add("status-dot");
        item.appendChild(dot);
        
        // Avatar circle (initials)
        const avatar = document.createElement("div");
        avatar.classList.add("user-avatar");
        avatar.textContent = user.substring(0, 2).toUpperCase();
        item.appendChild(avatar);
        
        // Name
        const name = document.createElement("div");
        name.classList.add("user-name");
        name.textContent = user;
        item.appendChild(name);
        
        userListContainer.appendChild(item);
    });
}

// --- Decryption Modal Handling ---

function showCryptoModal(messageId) {
    const data = messageStore[messageId];
    if (!data) return;
    
    modalPlaintext.textContent = data.plaintext;
    modalCiphertext.textContent = data.ciphertext;
    modalIv.textContent = data.iv;
    modalTag.textContent = data.tag;
    modalKey.textContent = data.key;
    
    cryptoModal.classList.add("active");
}

btnCloseModal.addEventListener("click", () => {
    cryptoModal.classList.remove("active");
});

// Close modal if clicking outside card
cryptoModal.addEventListener("click", (e) => {
    if (e.target === cryptoModal) {
        cryptoModal.classList.remove("active");
    }
});
