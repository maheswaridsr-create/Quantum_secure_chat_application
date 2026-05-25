import unittest
from quantum_key_gen import QuantumKeyGenerator, QISKIT_AVAILABLE

class TestQuantumKeyGenerator(unittest.TestCase):
    
    def test_key_generation(self):
        print(f"Qiskit Available in test: {QISKIT_AVAILABLE}")
        
        # Generate a 256-bit key
        details = QuantumKeyGenerator.generate_key_details(num_bits=256)
        
        # Verify keys and streams are present
        self.assertIn("key_hex", details)
        self.assertIn("binary_stream", details)
        self.assertIn("circuit_diagram", details)
        self.assertIn("statistics", details)
        
        # 256 bits is 32 bytes -> 64 hex characters
        self.assertEqual(len(details["key_hex"]), 64)
        
        # 256 binary characters
        self.assertEqual(len(details["binary_stream"]), 256)
        self.assertTrue(all(char in "01" for char in details["binary_stream"]))
        
        # Verify statistics
        stats = details["statistics"]
        self.assertEqual(stats["total_bits"], 256)
        self.assertGreaterEqual(stats["entropy"], 0.0)
        self.assertLessEqual(stats["entropy"], 1.0)
        
        # Display the result safely on Windows terminal
        import sys
        print("\n" + "="*50)
        print("TEST RUN RESULTS:")
        print(f"Source: {stats['source']}")
        print(f"AES-256 Key (Hex): {details['key_hex']}")
        print(f"Binary Stream (First 64 bits): {details['binary_stream'][:64]}...")
        print(f"Entropy: {stats['entropy']}")
        print(f"Bit Ratio (0/1): {stats['ratio_0_1']}")
        print("Quantum Circuit Diagram:")
        try:
            print(details["circuit_diagram"])
        except UnicodeEncodeError:
            # Fallback for systems/consoles that don't support UTF-8 display
            enc = sys.stdout.encoding or 'ascii'
            print(details["circuit_diagram"].encode(enc, errors='replace').decode(enc))
        print("="*50 + "\n")

if __name__ == "__main__":
    unittest.main()
