from flask import Flask, render_template, request, jsonify
import numpy as np
import pandas as pd
from tensorflow.keras.models import load_model
import joblib
import os

app = Flask(__name__)

# ========================
# LOAD MODEL AND SCALER
# ========================
MODEL_FILE = "weights/eeg_cnn_model_v2.h5"
SCALER_FILE = "scaler.pkl"
CHUNK_SIZE = 100
STEP_SIZE = 10
CONFIDENCE_THRESHOLD = 0.70

print("Loading model and scaler...")
model = load_model(MODEL_FILE)
scaler = joblib.load(SCALER_FILE)
print("✅ Model and scaler loaded successfully!")


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    try:
        if 'eeg_file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['eeg_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        data = pd.read_csv(file)

        required_cols = ['P4', 'Cz', 'F8', 'T7']
        if not all(col in data.columns for col in required_cols):
            return jsonify({'error': f'CSV must contain columns: {required_cols}'}), 400

        X_raw = data[required_cols].values
        X_scaled = scaler.transform(X_raw)

        # Create chunks
        X_chunks = []
        for i in range(0, len(X_scaled) - CHUNK_SIZE + 1, STEP_SIZE):
            X_chunks.append(X_scaled[i:i + CHUNK_SIZE])

        if len(X_chunks) == 0:
            return jsonify({'error': f'Not enough data. Need at least {CHUNK_SIZE} rows.'}), 400

        X_chunks = np.array(X_chunks)

        # Predict
        pred_probs = model.predict(X_chunks, verbose=0)
        pred_labels = np.argmax(pred_probs, axis=1)
        confidences = np.max(pred_probs, axis=1)

        # Majority vote
        unique, counts = np.unique(pred_labels, return_counts=True)
        predicted_user = int(unique[np.argmax(counts)])
        avg_confidence = float(np.mean(confidences[pred_labels == predicted_user]))
        max_confidence = float(np.max(confidences))

        # EEG data for visualization (send up to 300 points)
        num_points = min(300, len(X_raw))
        viz_data = {
            'P4': X_raw[:num_points, 0].tolist(),
            'Cz': X_raw[:num_points, 1].tolist(),
            'F8': X_raw[:num_points, 2].tolist(),
            'T7': X_raw[:num_points, 3].tolist(),
        }

        return jsonify({
            'success': True,
            'predicted_user': predicted_user,
            'confidence': round(avg_confidence, 4),
            'max_confidence': round(max_confidence, 4),
            'access_granted': avg_confidence >= CONFIDENCE_THRESHOLD,
            'threshold': CONFIDENCE_THRESHOLD,
            'eeg_data': viz_data,
            'num_chunks': len(X_chunks),
            'total_samples': len(X_raw),
            'prediction_distribution': {
                int(u): int(c) for u, c in zip(unique, counts)
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sample-files')
def sample_files():
    """List available sample test files"""
    samples = []
    for f in ['test_label5.csv', 'test_label15.csv', 'Random_data.csv']:
        if os.path.exists(f):
            samples.append(f)
    return jsonify({'files': samples})


@app.route('/api/sample/<filename>')
def get_sample(filename):
    """Authenticate using a sample file"""
    allowed = ['test_label5.csv', 'test_label15.csv', 'Random_data.csv']
    if filename not in allowed:
        return jsonify({'error': 'Invalid sample file'}), 400

    if not os.path.exists(filename):
        return jsonify({'error': 'Sample file not found'}), 404

    data = pd.read_csv(filename)
    required_cols = ['P4', 'Cz', 'F8', 'T7']
    X_raw = data[required_cols].values
    X_scaled = scaler.transform(X_raw)

    X_chunks = []
    for i in range(0, len(X_scaled) - CHUNK_SIZE + 1, STEP_SIZE):
        X_chunks.append(X_scaled[i:i + CHUNK_SIZE])

    if len(X_chunks) == 0:
        return jsonify({'error': 'Not enough data in sample'}), 400

    X_chunks = np.array(X_chunks)

    pred_probs = model.predict(X_chunks, verbose=0)
    pred_labels = np.argmax(pred_probs, axis=1)
    confidences = np.max(pred_probs, axis=1)

    unique, counts = np.unique(pred_labels, return_counts=True)
    predicted_user = int(unique[np.argmax(counts)])
    avg_confidence = float(np.mean(confidences[pred_labels == predicted_user]))
    max_confidence = float(np.max(confidences))

    num_points = min(300, len(X_raw))
    viz_data = {
        'P4': X_raw[:num_points, 0].tolist(),
        'Cz': X_raw[:num_points, 1].tolist(),
        'F8': X_raw[:num_points, 2].tolist(),
        'T7': X_raw[:num_points, 3].tolist(),
    }

    return jsonify({
        'success': True,
        'predicted_user': predicted_user,
        'confidence': round(avg_confidence, 4),
        'max_confidence': round(max_confidence, 4),
        'access_granted': avg_confidence >= CONFIDENCE_THRESHOLD,
        'threshold': CONFIDENCE_THRESHOLD,
        'eeg_data': viz_data,
        'num_chunks': len(X_chunks),
        'total_samples': len(X_raw),
        'sample_name': filename,
        'prediction_distribution': {
            int(u): int(c) for u, c in zip(unique, counts)
        }
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
