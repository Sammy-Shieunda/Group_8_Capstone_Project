# src/gradcam.py — STAGE 4b: manual Grad-CAM (layer-by-layer, bulletproof)
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
from preprocess import make_datasets

tr, va, te = make_datasets()
model = tf.keras.models.load_model("models/best_transfer.h5", compile=False)

# find the pieces: concat (gray->3ch), the MobileNet block, and the head after it
concat = [l for l in model.layers if "concat" in l.name.lower()][0]
base   = [l for l in model.layers if "mobilenet" in l.name.lower()][0]
head   = model.layers[model.layers.index(base) + 1:]   # GAP -> Dense -> Dropout -> Dense

def heatmap_for(img):
    with tf.GradientTape() as tape:
        x = tf.concat([img[None, ...]] * 3, axis=-1)   # gray -> 3 channels
        conv_out = base(x, training=False)
        tape.watch(conv_out)                       # gradients START here
        h = conv_out
        for L in head:                             # run the head by hand
            h = L(h, training=False)
        score = h[0][0]                            # Potential neuron
    grads = tape.gradient(score, conv_out)         # how much each feature pushes the score
    weights = tf.reduce_mean(grads, axis=(0, 1, 2))
    cam = tf.reduce_sum(weights[None, None, None, :] * conv_out, axis=-1)[0]
    cam = tf.nn.relu(cam)
    cam = (cam - tf.reduce_min(cam)) / (tf.reduce_max(cam) - tf.reduce_min(cam) + 1e-8)
    return tf.image.resize(cam[..., None], (224, 224))[..., 0].numpy()

xs, ys = next(iter(te))
xs, ys = xs[:4].numpy(), ys[:4].numpy()

fig, axes = plt.subplots(2, 4, figsize=(16, 8))
for j in range(4):
    cam = heatmap_for(xs[j])
    axes[0, j].imshow(xs[j][:, :, 0], cmap="gray")
    axes[0, j].set_title(f"true label = {ys[j]}")
    axes[0, j].axis("off")
    axes[1, j].imshow(xs[j][:, :, 0], cmap="gray")
    axes[1, j].imshow(cam, cmap="jet", alpha=0.5)
    axes[1, j].axis("off")
plt.tight_layout()
plt.savefig("reports/figures/gradcam_gallery.png")
print("saved reports/figures/gradcam_gallery.png")