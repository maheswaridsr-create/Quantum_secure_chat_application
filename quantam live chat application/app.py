import os
from flask import Flask, render_template, request, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from quantum_key_gen import QuantumKeyGenerator

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)

# Initialize SocketIO with cors allowed to avoid issues
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for active chat rooms
# Structure:
# {
#     "room_name": {
#         "key_details": {
#              "key_hex": "...",
#              "binary_stream": "...",
#              "circuit_diagram": "...",
#              "statistics": {...}
#          },
#         "users": ["username1", "username2", ...]
#     }
# }
active_rooms = {}

@app.route('/')
def index():
    """Renders the main dashboard HTML."""
    return render_template('index.html')

@socketio.on('join')
def handle_join(data):
    """Handles a user joining a secure chat room."""
    username = data.get('username')
    room = data.get('room')
    
    if not username or not room:
        return
    
    # Save room and username in socket session
    session['username'] = username
    session['room'] = room
    
    join_room(room)
    
    # Initialize room state if it doesn't exist
    if room not in active_rooms:
        key_details = QuantumKeyGenerator.generate_key_details(num_bits=256)
        active_rooms[room] = {
            "key_details": key_details,
            "users": []
        }
    
    # Add user if not already in the list
    if username not in active_rooms[room]["users"]:
        active_rooms[room]["users"].append(username)
        
    # Get current key details for key distribution
    key_details = active_rooms[room]["key_details"]
    
    # 1. Distribute current key details ONLY to the user who joined
    emit('key_distributed', {
        'key_details': key_details,
        'system_msg': f"Acquired secure session key from Quantum Generator ({key_details['statistics']['source']})."
    })
    
    # 2. Notify other users in the room of user entrance
    emit('user_joined', {
        'username': username,
        'users': active_rooms[room]["users"]
    }, to=room)
    
    # 3. Send system message to the room log
    emit('system_notification', {
        'message': f"{username} joined the secure room."
    }, to=room)

@socketio.on('message')
def handle_message(data):
    """Relays encrypted messages to the room."""
    room = session.get('room')
    sender = session.get('username')
    
    if not room or not sender:
        return
        
    ciphertext = data.get('ciphertext')
    iv = data.get('iv')
    tag = data.get('tag')
    
    if not ciphertext or not iv or not tag:
        return
        
    # Relay the encrypted payload to all users in the room
    emit('message', {
        'sender': sender,
        'ciphertext': ciphertext,
        'iv': iv,
        'tag': tag
    }, to=room)

@socketio.on('rotate_key')
def handle_rotate_key(data):
    """Triggers quantum session key rotation and redistributes to all users."""
    room = session.get('room')
    sender = session.get('username')
    
    if not room or room not in active_rooms:
        return
        
    # Generate a brand new quantum-enhanced key
    new_key_details = QuantumKeyGenerator.generate_key_details(num_bits=256)
    active_rooms[room]["key_details"] = new_key_details
    
    # Broadcast the new key to everyone in the room
    emit('key_distributed', {
        'key_details': new_key_details,
        'system_msg': f"Session key successfully rotated by {sender} using quantum randomness!"
    }, to=room)
    
    # Send system notification to the room
    emit('system_notification', {
        'message': f"Session key rotated by {sender}. All future messages will use the new key."
    }, to=room)

@socketio.on('leave')
def handle_leave(data=None):
    """Handles a user manually leaving the room."""
    username = session.get('username')
    room = session.get('room')
    
    _cleanup_user_from_room(username, room)

@socketio.on('disconnect')
def handle_disconnect():
    """Handles socket disconnection (e.g. closing tab)."""
    username = session.get('username')
    room = session.get('room')
    
    _cleanup_user_from_room(username, room)

def _cleanup_user_from_room(username, room):
    """Helper method to remove user from active lists and notify the room."""
    if not username or not room:
        return
        
    leave_room(room)
    
    # Remove from socket session
    session.pop('username', None)
    session.pop('room', None)
    
    if room in active_rooms:
        if username in active_rooms[room]["users"]:
            active_rooms[room]["users"].remove(username)
            
        # If room is empty, we delete the room from memory
        if not active_rooms[room]["users"]:
            del active_rooms[room]
        else:
            # Broadcast updated user list
            emit('user_left', {
                'username': username,
                'users': active_rooms[room]["users"]
            }, to=room)
            
            # Send system message
            emit('system_notification', {
                'message': f"{username} disconnected from the room."
            }, to=room)

if __name__ == '__main__':
    # Run server on port 5000
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
