# Quantum-Enhanced Secure Chat Application 🔐⚛️

A real-time encrypted chat application that combines **Quantum Computing simulation** and **Modern Cryptography** to provide highly secure communication.

This project uses **Qiskit** to generate quantum-random encryption keys and secures messages using **AES-GCM 256-bit encryption** with complete client-side end-to-end encryption.

---

## 🚀 Features

* ⚛️ Quantum-based AES key generation using Qiskit
* 🔐 End-to-End Encryption (AES-GCM 256-bit)
* 💬 Real-time messaging with Flask-SocketIO
* 🔄 Dynamic quantum key rotation
* 🧪 Live Quantum Inspector dashboard
* 🔍 Decryption Inspector for message analysis
* 🌌 Modern glassmorphism cyberpunk UI
* 🛡️ Secure entropy fallback using Python `secrets`

---

## ⚙️ How It Works

1. Qiskit creates a quantum circuit with qubits in superposition.
2. Measuring qubits produces random binary values.
3. Random bits are converted into a secure 256-bit AES key.
4. Messages are encrypted locally in the browser using Web Crypto API.
5. The server only relays encrypted ciphertext — plaintext never leaves the client.

---

## 🛠️ Tech Stack

| Technology     | Purpose                    |
| -------------- | -------------------------- |
| Python         | Backend Development        |
| Flask          | Web Framework              |
| Flask-SocketIO | Real-time Communication    |
| Qiskit         | Quantum Circuit Simulation |
| HTML/CSS/JS    | Frontend Development       |
| Web Crypto API | AES-GCM Encryption         |

---

## 📂 Project Structure

```bash id="6slny9"
QuantumSecureChat/
│
├── app.py
├── requirements.txt
├── templates/
├── static/
├── quantum/
└── README.md
```

---

## ▶️ Installation

```bash id="nhgrfq"
git clone https://github.com/your-username/QuantumSecureChat.git

cd QuantumSecureChat

pip install -r requirements.txt

python app.py
```

---

## 🔐 Security Highlights

* AES-GCM 256-bit Encryption
* Client-Side Encryption & Decryption
* Quantum Random Key Generation
* Unique IV for Every Message
* Authentication Tag Verification

---

## 🌟 Future Improvements

* Real IBM Quantum Hardware Integration
* Secure Voice & Video Communication
* Quantum Key Distribution (QKD)
* Multi-room Encrypted Chat

---

## 📜 License

MIT License

---

## 👩‍💻 Author

Built using Python, Quantum Computing, and Modern Cryptography.
