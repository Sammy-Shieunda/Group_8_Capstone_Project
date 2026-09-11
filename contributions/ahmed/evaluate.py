# src/evaluate.py — STAGE 4: Evaluation
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from sklearn.metrics import (classification_report, confusion_matrix,
                             roc_auc_score, roc_curve,
                             recall_score, precision_score, f1_score)
from preprocess import make_datasets, CLASSES

tr, va, te = make_datasets()
model = tf.keras.models.load_model("models/best_transfer.h5", compile=False)

# the untouched exam
y_true = np.concatenate([yy.numpy() for _, yy in te])
y_prob = model.predict(te, verbose=0).ravel()

print("=== TEST SET (untouched) ===")
print("ROC AUC:", round(roc_auc_score(y_true, y_prob), 3))
print(classification_report(y_true, (y_prob >= 0.5).astype(int),
                            target_names=CLASSES))

# YOUR decision: the threshold sweep
print("threshold | recall | precision | f1")
for t in np.arange(0.30, 0.75, 0.05):
    p = (y_prob >= t).astype(int)
    print(f"   {t:.2f}   |  {recall_score(y_true, p):.2f}  |  {precision_score(y_true, p):.2f}  |  {f1_score(y_true, p):.2f}")

print("Confusion matrix @0.5:")
print(confusion_matrix(y_true, (y_prob >= 0.5).astype(int)))

fpr, tpr, _ = roc_curve(y_true, y_prob)
plt.figure(figsize=(6, 5))
plt.plot(fpr, tpr, marker="o")
plt.xlabel("False Positive Rate")
plt.ylabel("Recall (TPR)")
plt.title(f"ROC — AUC={roc_auc_score(y_true, y_prob):.3f}")
plt.grid()
plt.savefig("reports/figures/roc_curve.png")
print("saved reports/figures/roc_curve.png")