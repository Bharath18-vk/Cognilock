import pandas as pd
import numpy as np
import os
import time
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv1D, MaxPooling1D, Flatten, Dense, Dropout, BatchNormalization
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# =========================
# STEP 1: LOAD DATA
data = pd.read_csv("combined_data.csv")
print("✅ Data loaded:", data.shape)

# =========================
# STEP 2: SPLIT FEATURES & LABEL
X_raw = data[['P4', 'Cz', 'F8', 'T7']].values
y_raw = data['label'].values

# =========================
# STEP 3: SCALE DATA
scaler = StandardScaler()
X_raw = scaler.fit_transform(X_raw)
joblib.dump(scaler, "scaler.pkl")
print("✅ Scaler saved as scaler.pkl")

# =========================
# STEP 4: CREATE TIME SEQUENCES
chunk_size = 100
step_size = 5

X = []
y = []

for label in np.unique(y_raw):
    person_data = X_raw[y_raw == label]
    for i in range(0, len(person_data) - chunk_size, step_size):
        chunk = person_data[i:i+chunk_size]
        noise = np.random.normal(0, 0.01, chunk.shape)
        chunk = chunk + noise
        X.append(chunk)
        y.append(label)

X = np.array(X)
y = np.array(y)
print("✅ Final data shape:", X.shape)

# =========================
# STEP 5: TRAIN TEST SPLIT
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, shuffle=True
)

num_classes = len(np.unique(y))
y_train = to_categorical(y_train, num_classes)
y_test = to_categorical(y_test, num_classes)

# =========================
# STEP 6: BUILD MODEL (1D CNN)
model = Sequential()

model.add(Conv1D(64, 3, activation='relu', input_shape=(chunk_size, 4)))
model.add(BatchNormalization())
model.add(MaxPooling1D(2))

model.add(Conv1D(128, 3, activation='relu'))
model.add(BatchNormalization())
model.add(MaxPooling1D(2))

model.add(Conv1D(256, 3, activation='relu'))
model.add(BatchNormalization())
model.add(MaxPooling1D(2))

model.add(Flatten())

model.add(Dense(512, activation='relu'))
model.add(Dropout(0.3))

model.add(Dense(num_classes, activation='softmax'))

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# =========================
# STEP 7: CALLBACKS
early_stop = EarlyStopping(
    monitor='val_accuracy', 
    patience=10, 
    restore_best_weights=True
)

reduce_lr = ReduceLROnPlateau(
    monitor='val_loss', 
    factor=0.5, 
    patience=5, 
    min_lr=1e-6
)

# =========================
# STEP 8: TRAIN MODEL
start = time.time()

history = model.fit(
    X_train, y_train,
    epochs=15,           # 👈 Reduced epochs
    batch_size=32,
    validation_data=(X_test, y_test),
    callbacks=[early_stop, reduce_lr]
)

end = time.time()
print("✅ Training Time:", round(end - start, 2), "seconds")

# =========================
# STEP 9: SAVE MODEL
os.makedirs("weights", exist_ok=True)
model.save("weights/eeg_cnn_model_v2.h5")
print("✅ Model saved at weights/eeg_cnn_model_v2.h5")

# =========================
# STEP 10: EVALUATE
loss, accuracy = model.evaluate(X_test, y_test)
print("✅ Test Accuracy:", round(accuracy * 100, 2), "%")