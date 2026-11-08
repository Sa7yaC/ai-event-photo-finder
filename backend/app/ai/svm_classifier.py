"""
SVM Classifier for Dlib 128-dimensional Face Embeddings.

Combines Dlib metric feature vectors with a personalized Support Vector Machine
(Linear Support Vector Classifier) to learn an optimal maximum-margin hyperplane
separating the attendee's probe selfies (Front, Left 45°, Right 45°) from
event distractor faces.
"""
import logging
from typing import List, Optional
import numpy as np
from sklearn.svm import LinearSVC

logger = logging.getLogger(__name__)


class FaceSVMClassifier:
    """
    Fits a personalized linear Support Vector Machine on 128-d Dlib face embeddings.
    """

    def __init__(self, c_param: float = 1.0):
        self.c_param = c_param
        self.clf: Optional[LinearSVC] = None
        self.is_fitted: bool = False

    def fit(
        self,
        probe_embeddings: List[np.ndarray],
        distractor_embeddings: List[np.ndarray],
        num_jitters: int = 5,
    ) -> bool:
        """
        Train the SVM classifier:
        - Positive class (y = 1): attendee probe embeddings + synthetic jitter augmentations
        - Negative class (y = 0): background / distractor faces from the gallery
        """
        if not probe_embeddings:
            return False

        try:
            # Positive class: attendee's probe embeddings + jitter
            # Positive class: attendee's probe embeddings + multi-angle manifold interpolation + jitter
            pos_samples: List[np.ndarray] = []
            norm_probes: List[np.ndarray] = []
            for p in probe_embeddings:
                p_norm = p.astype(np.float32) / (np.linalg.norm(p) + 1e-8)
                norm_probes.append(p_norm)
                pos_samples.append(p_norm)

            # Synthesize intermediate angular manifold vectors if multiple probes are available
            if len(norm_probes) > 1:
                for i in range(len(norm_probes)):
                    for j in range(i + 1, len(norm_probes)):
                        mid = (norm_probes[i] + norm_probes[j]) / 2.0
                        pos_samples.append(mid / (np.linalg.norm(mid) + 1e-8))

            # Jitter augmentations along positive manifold
            current_pos = list(pos_samples)
            for p_norm in current_pos:
                for _ in range(num_jitters):
                    noise = np.random.normal(0, 0.012, size=p_norm.shape).astype(np.float32)
                    jittered = p_norm + noise
                    pos_samples.append(jittered / (np.linalg.norm(jittered) + 1e-8))

            X_pos = np.array(pos_samples, dtype=np.float32)

            # Negative class: genuine distractor faces from the event gallery.
            # CRITICAL: We only admit distractors whose minimum distance to ALL probes is > 0.75.
            # Using an aggressive threshold (e.g. 0.55) mistakenly treated the attendee's own
            # cross-pose strict side profile faces as negative training samples!
            neg_candidates: List[np.ndarray] = []
            for d in distractor_embeddings:
                d_norm = d.astype(np.float32) / (np.linalg.norm(d) + 1e-8)
                min_d = min(float(np.linalg.norm(p - d_norm)) for p in norm_probes)
                if min_d > 0.75:
                    neg_candidates.append(d_norm)

            # If very few event distractors are available, synthesize orthogonal negative vectors
            if len(neg_candidates) < 15:
                rng = np.random.default_rng(seed=42)
                for _ in range(40):
                    rand_vec = rng.normal(0, 1.0, size=norm_probes[0].shape).astype(np.float32)
                    rand_vec /= (np.linalg.norm(rand_vec) + 1e-8)
                    min_d = min(float(np.linalg.norm(p - rand_vec)) for p in norm_probes)
                    if min_d > 0.80:
                        neg_candidates.append(rand_vec)

            X_neg = np.array(neg_candidates, dtype=np.float32)

            X = np.vstack([X_pos, X_neg])
            y = np.hstack([np.ones(len(X_pos), dtype=np.float32), np.zeros(len(X_neg), dtype=np.float32)])

            self.clf = LinearSVC(
                C=self.c_param,
                class_weight="balanced",
                dual="auto",
                random_state=42,
                max_iter=2000,
            )
            self.clf.fit(X, y)
            self.is_fitted = True
            logger.debug(
                "FaceSVMClassifier trained with %d positive and %d negative samples.",
                len(X_pos),
                len(X_neg),
            )
            return True

        except Exception as exc:
            logger.warning("Failed to fit FaceSVMClassifier: %s", exc)
            self.is_fitted = False
            return False

    def score(self, face_embedding: np.ndarray) -> float:
        """
        Returns the signed distance to the separating hyperplane.
        f(x) > 0 indicates predicted attendee match.
        """
        if not self.is_fitted or self.clf is None:
            return 0.0
        vec = (face_embedding.astype(np.float32) / (np.linalg.norm(face_embedding) + 1e-8)).reshape(1, -1)
        return float(self.clf.decision_function(vec)[0])

    def predict_confidence(self, face_embedding: np.ndarray, min_dist: Optional[float] = None) -> float:
        """
        Calibrated match confidence in percentage [40%, 99%].
        Combines SVM decision margin with Euclidean metric distance.
        """
        score = self.score(face_embedding)
        # Sigmoidal mapping of SVM margin
        prob = 1.0 / (1.0 + np.exp(-4.0 * score))
        conf_from_svm = float(prob * 100.0)

        if min_dist is not None:
            # Distance-based confidence calibrated for Dlib ResNet metric space:
            # 0.00 -> 99%, 0.30 -> 80%, 0.60 -> 60%
            conf_from_dist = max(40.0, min(99.0, 100.0 - (min_dist / 0.60) * 40.0))
            # Weighted ensemble: 50% SVM margin, 50% distance
            return round(float(0.5 * conf_from_svm + 0.5 * conf_from_dist), 1)

        return round(float(np.clip(conf_from_svm, 40.0, 99.0)), 1)
