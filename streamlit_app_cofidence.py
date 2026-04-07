import streamlit as st
import pandas as pd
import numpy as np
from tensorflow.keras.models import load_model
import joblib

# =========================
# SETTINGS
MODEL_FILE = "weights/eeg_cnn_model_v2.h5"
SCALER_FILE = "scaler.pkl"
CHUNK_SIZE = 100
STEP_SIZE = 10
CONFIDENCE_THRESHOLD = 1 # Access granted if confidence >= this

# =========================
# LOAD MODEL AND SCALER
@st.cache(allow_output_mutation=True)
def load_model_and_scaler():
    model = load_model(MODEL_FILE)
    scaler = joblib.load(SCALER_FILE)
    return model, scaler

model, scaler = load_model_and_scaler()

# =========================
# STREAMLIT INTERFACE
st.title("EEG Biometric Authenticator")
st.write("Upload a CSV file (100 rows of EEG signals) to predict the person and grant access based on confidence.")

uploaded_file = st.file_uploader("Choose a CSV", type="csv")

if uploaded_file is not None:
    data = pd.read_csv(uploaded_file)
    X_raw = data[['P4', 'Cz', 'F8', 'T7']].values
    X_scaled = scaler.transform(X_raw)

    # Create chunks
    X_chunks = []
    for i in range(0, len(X_scaled) - CHUNK_SIZE + 1, STEP_SIZE):
        X_chunks.append(X_scaled[i:i+CHUNK_SIZE])
    X_chunks = np.array(X_chunks)

    # Predict
    pred_probs = model.predict(X_chunks)
    pred_labels = np.argmax(pred_probs, axis=1)
    confidences = np.max(pred_probs, axis=1)

    # Majority vote
    unique, counts = np.unique(pred_labels, return_counts=True)
    predicted_user = unique[np.argmax(counts)]
    avg_confidence = np.mean(confidences[pred_labels == predicted_user])

    st.write(f"Predicted Person ID: {predicted_user}")
    st.write(f"Average Confidence: {avg_confidence:.3f}")

    # Access control based on confidence only
    if avg_confidence >= CONFIDENCE_THRESHOLD:
        st.success("✅ Access GRANTED")
    else:
        st.error("❌ Access DENIED")