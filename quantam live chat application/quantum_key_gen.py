import math
import binascii
import os

# Try to import Qiskit modules, set flag
try:
    from qiskit import QuantumCircuit, transpile
    from qiskit.providers.basic_provider import BasicProvider
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False

class QuantumKeyGenerator:
    """
    Generates cryptographically secure keys using quantum randomness simulation via Qiskit.
    Falls back to Python's secrets module if Qiskit is not available or fails.
    """
    
    @staticmethod
    def calculate_entropy(bit_string):
        """Calculates Shannon entropy of the bit string to show security/randomness."""
        if not bit_string:
            return 0.0
        count_0 = bit_string.count('0')
        count_1 = bit_string.count('1')
        total = len(bit_string)
        
        p0 = count_0 / total
        p1 = count_1 / total
        
        entropy = 0.0
        if p0 > 0:
            entropy -= p0 * math.log2(p0)
        if p1 > 0:
            entropy -= p1 * math.log2(p1)
        return round(entropy, 4)

    @classmethod
    def generate_key_details(cls, num_bits=256):
        """
        Generates a random key and returns details:
        - key_hex: The hexadecimal key
        - binary_stream: The raw binary string
        - circuit_diagram: ASCII/Unicode text diagram of the circuit
        - statistics: Dict of entropy, 0/1 counts, and source type
        """
        # Validate num_bits is divisible by 8
        if num_bits % 8 != 0:
            num_bits = ((num_bits // 8) + 1) * 8

        num_bytes = num_bits // 8

        if QISKIT_AVAILABLE:
            try:
                # 8 qubits, we run enough shots to get the required bits
                num_qubits = 8
                shots = num_bytes  # Each shot gives 8 bits (1 byte)
                
                qc = QuantumCircuit(num_qubits)
                # Put all qubits in superposition
                for i in range(num_qubits):
                    qc.h(i)
                qc.measure_all()
                
                # Get BasicProvider and basic_simulator
                provider = BasicProvider()
                backend = provider.get_backend("basic_simulator")
                
                # Transpile and run the circuit
                t_qc = transpile(qc, backend)
                job = backend.run(t_qc, shots=shots, memory=True)
                result = job.result()
                
                # Retrieve individual shot measurements
                memory = result.get_memory() # List of 'shots' strings, e.g. ['01101010', ...]
                binary_stream = "".join(memory)[:num_bits]
                
                # Generate key hex
                key_bytes = int(binary_stream, 2).to_bytes(num_bytes, byteorder='big')
                key_hex = binascii.hexlify(key_bytes).decode('utf-8')
                
                # Generate circuit diagram as string
                # We draw it with UTF-8 support
                try:
                    circuit_diagram = str(qc.draw(output='text'))
                except Exception:
                    circuit_diagram = cls._get_fallback_circuit_text(num_qubits)
                
                # Statistics
                count_0 = binary_stream.count('0')
                count_1 = binary_stream.count('1')
                entropy = cls.calculate_entropy(binary_stream)
                
                return {
                    "key_hex": key_hex,
                    "binary_stream": binary_stream,
                    "circuit_diagram": circuit_diagram,
                    "statistics": {
                        "source": "Quantum Simulator (Qiskit)",
                        "entropy": entropy,
                        "qubits_used": num_qubits,
                        "shots": shots,
                        "total_bits": num_bits,
                        "count_0": count_0,
                        "count_1": count_1,
                        "ratio_0_1": f"{count_0}/{count_1}"
                    }
                }
            except Exception as e:
                # Log error and proceed to fallback
                print(f"Error during Qiskit execution, falling back: {e}")
                
        # Fallback Mode using secrets module
        import secrets
        key_bytes = secrets.token_bytes(num_bytes)
        key_hex = binascii.hexlify(key_bytes).decode('utf-8')
        
        # Convert bytes to binary string
        binary_stream = "".join(f"{b:08b}" for b in key_bytes)
        
        count_0 = binary_stream.count('0')
        count_1 = binary_stream.count('1')
        entropy = cls.calculate_entropy(binary_stream)
        
        circuit_diagram = (
            "=================== FALLBACK MODE ===================\n"
            " Qiskit Simulation was bypassed or failed.          \n"
            " Key generated using Python's cryptographically     \n"
            " secure secrets module (OS-level entropy PRNG).      \n"
            "=====================================================\n"
            " No quantum circuit active.                         \n"
        )
        
        return {
            "key_hex": key_hex,
            "binary_stream": binary_stream,
            "circuit_diagram": circuit_diagram,
            "statistics": {
                "source": "OS Entropy (secrets module fallback)",
                "entropy": entropy,
                "qubits_used": 0,
                "shots": 0,
                "total_bits": num_bits,
                "count_0": count_0,
                "count_1": count_1,
                "ratio_0_1": f"{count_0}/{count_1}"
            }
        }

    @staticmethod
    def _get_fallback_circuit_text(num_qubits):
        """Generates a text representation of the circuit if Qiskit draw fails."""
        lines = []
        for i in range(num_qubits):
            lines.append(f"q_{i}: ──[ H ]──[ M ]──")
        return "\n".join(lines)
