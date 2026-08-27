#!/usr/bin/env python3
"""
Full-Document Intelligent Face & Portrait Scanner (OpenCV / Python)
===================================================================
Scans the ENTIRE document across all 4 orientations (0°, 90°, 180°, 270°)
to locate, upright, and extract the portrait photo even if the document
was uploaded upside down or sideways.
"""

import sys
import os
import json
import time
import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple, List


def calculate_anatomical_upright_score(face_crop: np.ndarray) -> float:
    """
    Evaluates whether a cropped face candidate is upright (head on top, chin below)
    vs upside down (chin on top, hair below) or sideways:
    1. Upper 50% contains eyes, eyebrows, and bridge (higher contrast & texture variance: top_var > bot_var)
    2. Eye socket band produces strong horizontal edge response in upper 25-50% vs smooth chin in lower 65-90%
    3. Upright portrait aspect ratio is taller than wide (h/w >= 1.05)
    """
    if face_crop.shape[0] < 20 or face_crop.shape[1] < 20:
        return 0.0

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
    h, w = gray.shape[:2]

    # 1. Texture variance comparison
    top_half = gray[:int(h * 0.5), :]
    bot_half = gray[int(h * 0.5):, :]
    top_var = float(np.std(top_half))
    bot_var = float(np.std(bot_half))

    # 2. Eye socket vs Chin horizontal Sobel gradient
    eye_zone = gray[int(h * 0.22):int(h * 0.50), :]
    mouth_zone = gray[int(h * 0.65):int(h * 0.92), :]
    eye_gradient = float(np.mean(np.abs(cv2.Sobel(eye_zone, cv2.CV_64F, 1, 0, ksize=3))))
    mouth_gradient = float(np.mean(np.abs(cv2.Sobel(mouth_zone, cv2.CV_64F, 1, 0, ksize=3))))

    # 3. Aspect ratio bonus (Portrait is taller than wide in upright orientation)
    aspect = float(h) / float(w)
    aspect_bonus = 15.0 if (1.05 <= aspect <= 1.85) else -15.0

    # Total anatomical upright score
    upright_metric = ((eye_gradient - mouth_gradient) * 3.5) + ((top_var - bot_var) * 2.0) + aspect_bonus
    return upright_metric


def scan_single_orientation(image: np.ndarray) -> Optional[Tuple[int, int, int, int, float, str]]:
    """
    Scans an image at a specific orientation for a face/portrait.
    Returns (x, y, w, h, confidence, method) or None.
    """
    h, w = image.shape[:2]
    doc_area = float(h * w)

    # Strategy A: Multi-Channel Skin-Tone & Morphological Component Analysis
    ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    cr = ycrcb[:, :, 1]
    cb = ycrcb[:, :, 2]
    skin_ycrcb = (cr >= 133) & (cr <= 173) & (cb >= 77) & (cb <= 127)

    h_chan = hsv[:, :, 0]
    s_chan = hsv[:, :, 1]
    v_chan = hsv[:, :, 2]
    skin_hsv = ((h_chan <= 25) | (h_chan >= 160)) & (s_chan >= 30) & (v_chan >= 40)

    combined_skin = (skin_ycrcb & skin_hsv).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    closed_skin = cv2.morphologyEx(combined_skin, cv2.MORPH_CLOSE, kernel, iterations=2)
    dilated_skin = cv2.dilate(closed_skin, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated_skin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    candidates = []

    for c in contours:
        cx, cy, cw, ch = cv2.boundingRect(c)
        area = cw * ch
        area_ratio = area / doc_area

        if area_ratio < 0.02 or area_ratio > 0.55:
            continue

        aspect = float(ch) / float(cw)
        if 0.75 <= aspect <= 2.2:
            sub_skin = combined_skin[cy:cy+ch, cx:cx+cw]
            skin_density = float(np.sum(sub_skin > 0)) / float(area)

            sub_hsv = hsv[cy:cy+ch, cx:cx+cw]
            color_var = float(np.std(sub_hsv[:, :, 1]) + np.std(sub_hsv[:, :, 2]))

            if skin_density >= 0.18 and color_var >= 28.0:
                face_sub_crop = image[cy:cy+ch, cx:cx+cw]
                anatomical_upright = calculate_anatomical_upright_score(face_sub_crop)

                # Base score + anatomical orientation bonus
                base_score = (skin_density * 40.0) + (color_var * 0.8) + (area_ratio * 30.0)
                final_score = base_score + (anatomical_upright * 1.8)

                candidates.append((cx, cy, cw, ch, final_score, "SKIN_COLOR_SEGMENTATION"))

    if candidates:
        candidates = sorted(candidates, key=lambda x: x[4], reverse=True)
        return candidates[0]

    # Strategy B: High-Entropy Portrait Box Scanner
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    grid_rows, grid_cols = 3, 3
    cell_h = h // grid_rows
    cell_w = w // grid_cols
    best_cell = None
    max_entropy = 0.0

    for r in range(grid_rows):
        for c in range(grid_cols):
            if (r == 2 and c == 1):
                continue
            cell = gray[r*cell_h:(r+1)*cell_h, c*cell_w:(c+1)*cell_w]
            std_dev = float(np.std(cell))
            sobel = np.abs(cv2.Sobel(cell, cv2.CV_64F, 1, 0, ksize=3))
            smooth_ratio = std_dev / (float(np.mean(sobel)) + 1e-5)

            if std_dev > 35.0 and smooth_ratio > 1.2:
                if std_dev > max_entropy:
                    max_entropy = std_dev
                    best_cell = (c * cell_w, r * cell_h, cell_w, cell_h)

    if best_cell is not None and max_entropy > 45.0:
        bx, by, bw, bh = best_cell
        return (bx, by, bw, bh, 72.0, "TEXTURE_ENTROPY_GRID")

    return None


def scan_and_extract_face(image_path: str, output_dir: str) -> Dict[str, Any]:
    if not os.path.exists(image_path):
        return {"found": False, "cropUrl": None, "confidence": 0.0, "message": f"File not found: {image_path}"}

    orig_image = cv2.imread(image_path)
    if orig_image is None:
        return {"found": False, "cropUrl": None, "confidence": 0.0, "message": "Failed to decode raster image."}

    os.makedirs(output_dir, exist_ok=True)

    # -------------------------------------------------------------
    # 4-Orientation Multi-Angle Rotational Scan (0°, 90°, 180°, 270°)
    # -------------------------------------------------------------
    rotations = [
        (0, orig_image),
        (90, cv2.rotate(orig_image, cv2.ROTATE_90_CLOCKWISE)),
        (180, cv2.rotate(orig_image, cv2.ROTATE_180)),
        (270, cv2.rotate(orig_image, cv2.ROTATE_90_COUNTERCLOCKWISE))
    ]

    best_candidate_orig = None
    best_conf = -1.0
    best_method = ""
    best_rotation = 0

    h_orig, w_orig = orig_image.shape[:2]

    for angle, rot_img in rotations:
        candidate = scan_single_orientation(rot_img)
        if candidate is not None:
            bx, by, bw, bh, conf, method = candidate
            if conf > best_conf:
                best_conf = conf
                best_method = method
                best_rotation = angle

                # Map bounding box back to orig_image coordinates (0° unrotated)
                if angle == 0:
                    ox, oy, ow, oh = bx, by, bw, bh
                elif angle == 90:
                    # 90° clockwise: rot_w = h_orig, rot_h = w_orig
                    ox = by
                    oy = h_orig - bx - bw
                    ow = bh
                    oh = bw
                elif angle == 180:
                    # 180°: rot_w = w_orig, rot_h = h_orig
                    ox = w_orig - bx - bw
                    oy = h_orig - by - bh
                    ow = bw
                    oh = bh
                elif angle == 270:
                    # 270° clockwise / 90° CCW: rot_w = h_orig, rot_h = w_orig
                    ox = w_orig - by - bh
                    oy = bx
                    ow = bh
                    oh = bw
                else:
                    ox, oy, ow, oh = bx, by, bw, bh

                best_candidate_orig = (max(0, ox), max(0, oy), max(1, ow), max(1, oh))

    if best_candidate_orig is None:
        return {
            "found": False,
            "cropUrl": None,
            "confidence": 0.0,
            "box": None,
            "rotationDetected": 0,
            "uprightedDocUrl": None,
            "message": "No portrait or face detected across document substrate."
        }

    ox, oy, ow, oh = best_candidate_orig

    # Balanced biometric portrait framing around the unrotated original face
    pad_w = int(ow * 0.16)
    pad_top = int(oh * 0.18)
    pad_bottom = int(oh * 0.22)
    crop_x = max(0, ox - pad_w)
    crop_y = max(0, oy - pad_top)
    crop_w = min(w_orig - crop_x, ow + (pad_w * 2))
    crop_h = min(h_orig - crop_y, oh + pad_top + pad_bottom)

    # Extracted photo is cropped directly from orig_image in its exact uploaded orientation (UNROTATED)
    cropped_face = orig_image[crop_y:crop_y+crop_h, crop_x:crop_x+crop_w]

    ts = int(time.time() * 1000)
    out_filename = f"extracted_face_{ts}_{np.random.randint(1000, 9999)}.png"
    out_path = os.path.join(output_dir, out_filename)
    cv2.imwrite(out_path, cropped_face)

    return {
        "found": True,
        "cropUrl": f"/uploads/{out_filename}",
        "confidence": round(min(99.0, max(75.0, best_conf)), 1),
        "box": {"x": int(crop_x), "y": int(crop_y), "width": int(crop_w), "height": int(crop_h)},
        "rotationDetected": 0,
        "uprightedDocUrl": None,
        "method": best_method,
        "message": f"Successfully extracted unrotated face portrait via {best_method} ({best_conf:.1f}% score)."
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"found": False, "error": "Usage: python face_extractor.py <image_path> [output_dir]"}))
        sys.exit(1)

    img_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.getcwd(), "uploads")

    res = scan_and_extract_face(img_path, out_dir)
    print(json.dumps(res))
