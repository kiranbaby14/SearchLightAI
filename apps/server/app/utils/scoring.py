"""
Score rescaling for SigLIP embeddings.

SigLIP uses sigmoid loss (not softmax like CLIP), producing lower raw scores.
A "good match" is typically 0.15-0.35 cosine similarity.

Reference: https://github.com/mlfoundations/open_clip/issues/716
"""

import math


def rescale_siglip_score(cosine_score: float) -> float:
    """
    Rescale SigLIP cosine similarity to intuitive 0-1 range.

    Maps: 0.35 → ~90%, 0.25 → ~70%, 0.18 → ~50%, 0.10 → ~25%
    """
    midpoint = 0.18
    steepness = 12

    x = (cosine_score - midpoint) * steepness
    rescaled = 1 / (1 + math.exp(-x))

    # Clamp to valid range
    return max(0.0, min(1.0, rescaled))
