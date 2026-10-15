# Discogs-EffNet v1

Original, unmodified ONNX weights and metadata by Pablo Alonso / Music Technology
Group, Universitat Pompeu Fabra, 2022. Source:
https://essentia.upf.edu/models/music-style-classification/discogs-effnet/

Weights: CC BY-NC-SA 4.0 (see LICENSE). This personal local app uses the weights
for noncommercial analysis. Commercial distribution requires reviewing the model
license or obtaining a separate license from MTG. ONNX Runtime is MIT licensed.

Citation: Alonso-Jiménez, Serra, Bogdanov, “Music Representation Learning Based
on Editorial Metadata from Discogs”, ISMIR 2022. Weights are not modified.

The installer checks pinned SHA256 values in backend/styles.py. Inference uses
the CPU provider with two threads; no audio is uploaded.
