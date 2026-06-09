"""
Object Detection System - Flask Backend
========================================
Backend: Flask (Python)
Model: COCO pre-trained object detector
"""

import os
import uuid
import json
import logging
from pathlib import Path
from collections import Counter

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont
import numpy as np

# ─────────────────────────────────────────────
# App Configuration
# ─────────────────────────────────────────────
app = Flask(__name__)

# Secret key for session security
app.config['SECRET_KEY'] = 'objectdetection_mini_project_2024'

# Upload folder path
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed image extensions
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# Max file size: 16 MB
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# YOLO Model Loading (Lazy Load on first use)
# ─────────────────────────────────────────────
_model = None  # Global model variable

def get_model():
    global _model
    if _model is None:
        from ultralytics import YOLO
        # Check model/ folder first, then root, then download
        model_path = os.path.join(os.path.dirname(__file__), 'model', 'yolov8n.pt')
        root_path = os.path.join(os.path.dirname(__file__), 'yolov8n.pt')
        
        if os.path.exists(model_path):
            _model = YOLO(model_path)
        elif os.path.exists(root_path):
            _model = YOLO(root_path)
        else:
            _model = YOLO('yolov8n.pt')  # downloads if missing
    return _model

# ─────────────────────────────────────────────
# Bounding Box Color Palette (per class)
# ─────────────────────────────────────────────
# 20 visually distinct colors for bounding boxes
BOX_COLORS = [
    (255, 59,  48),   # Red
    (52,  199, 89),   # Green
    (0,   122, 255),  # Blue
    (255, 149, 0),    # Orange
    (175, 82,  222),  # Purple
    (255, 45,  85),   # Pink
    (90,  200, 250),  # Cyan
    (255, 204, 0),    # Yellow
    (162, 132, 94),   # Brown
    (88,  86,  214),  # Indigo
    (0,   199, 190),  # Teal
    (255, 159, 10),   # Amber
    (48,  209, 88),   # Mint
    (100, 210, 255),  # Sky
    (255, 69,  58),   # Coral
    (191, 90,  242),  # Violet
    (50,  173, 230),  # Cerulean
    (255, 214, 10),   # Gold
    (99,  230, 190),  # Sea Green
    (215, 0,   21),   # Crimson
]

def get_box_color(class_id: int) -> tuple:
    """Return a consistent color for a given class ID."""
    return BOX_COLORS[class_id % len(BOX_COLORS)]

# ─────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    """Check if the uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def draw_bounding_boxes(image: Image.Image, detections: list) -> Image.Image:
    """
    Draws bounding boxes with labels and confidence scores on the image.

    Args:
        image: PIL Image object
        detections: list of detection dicts from run_detection()

    Returns:
        PIL Image with bounding boxes drawn
    """
    draw = ImageDraw.Draw(image)
    width, height = image.size

    # Dynamic font size based on image dimensions
    font_size = max(14, int(min(width, height) * 0.022))

    # Try to load a TrueType font, fall back to default if not available
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size - 2)
    except (IOError, OSError):
        font = ImageFont.load_default()
        small_font = font

    box_thickness = max(2, int(min(width, height) * 0.004))

    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        color = tuple(det['color'])
        label = f"{det['label']} {det['confidence']:.0%}"

        # Draw bounding box (thick rectangle)
        for t in range(box_thickness):
            draw.rectangle([x1 - t, y1 - t, x2 + t, y2 + t], outline=color)

        # Label background dimensions
        try:
            bbox_text = draw.textbbox((0, 0), label, font=font)
            text_w = bbox_text[2] - bbox_text[0]
            text_h = bbox_text[3] - bbox_text[1]
        except AttributeError:
            text_w, text_h = draw.textsize(label, font=font)

        label_y = max(0, y1 - text_h - 8)

        # Filled label background
        draw.rectangle(
            [x1, label_y, x1 + text_w + 10, label_y + text_h + 6],
            fill=color
        )

        # Label text (white)
        draw.text((x1 + 5, label_y + 3), label, fill=(255, 255, 255), font=font)

    return image


def run_detection(image_path: str, conf_threshold: float = 0.25) -> dict:
    """
    Runs YOLOv8 object detection on the given image file.

    Args:
        image_path: Absolute path to the image file
        conf_threshold: Minimum confidence score to keep a detection

    Returns:
        dict containing:
          - detections: list of detected objects with label, confidence, bbox, color
          - summary: count of each detected class
          - output_filename: filename of the annotated image saved to uploads/
          - error: error message string (or None)
    """
    try:
        model = get_model()

        # Load image via PIL (ensures correct orientation)
        pil_img = Image.open(image_path).convert('RGB')

        # Run inference
        results = model.predict(source=image_path, conf=conf_threshold, verbose=False)
        result = results[0]

        detections = []

        if result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes

            for i in range(len(boxes)):
                # Bounding box coordinates (xyxy format)
                xyxy = boxes.xyxy[i].cpu().numpy()
                x1, y1, x2, y2 = int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])

                # Confidence score
                conf = float(boxes.conf[i].cpu().numpy())

                # Class ID and name
                cls_id = int(boxes.cls[i].cpu().numpy())
                cls_name = result.names[cls_id]

                color = get_box_color(cls_id)

                detections.append({
                    'label': cls_name,
                    'confidence': round(conf, 4),
                    'bbox': [x1, y1, x2, y2],
                    'class_id': cls_id,
                    'color': list(color),
                })

        # Sort by confidence (highest first)
        detections.sort(key=lambda d: d['confidence'], reverse=True)

        # Build summary: count per class
        class_counts = Counter(d['label'] for d in detections)
        summary = [{'label': k, 'count': v} for k, v in sorted(class_counts.items())]

        # Draw bounding boxes on a copy of the image
        annotated_img = pil_img.copy()
        if detections:
            annotated_img = draw_bounding_boxes(annotated_img, detections)

        # Save annotated image
        out_filename = f"annotated_{uuid.uuid4().hex[:8]}_{Path(image_path).name}"
        out_path = os.path.join(UPLOAD_FOLDER, out_filename)
        annotated_img.save(out_path, quality=92)

        return {
            'detections': detections,
            'summary': summary,
            'output_filename': out_filename,
            'total_objects': len(detections),
            'error': None,
        }

    except Exception as e:
        logger.exception("Error during object detection")
        return {
            'detections': [],
            'summary': [],
            'output_filename': None,
            'total_objects': 0,
            'error': str(e),
        }

# ─────────────────────────────────────────────
# Flask Routes
# ─────────────────────────────────────────────

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')


@app.route('/detect', methods=['POST'])
def detect():
    """
    POST /detect
    Accepts a multipart form with 'image' field.
    Runs YOLO object detection and returns JSON results.
    """
    # ── Validate request ──────────────────────
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No image file provided in the request.'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected. Please choose an image.'}), 400

    if not allowed_file(file.filename):
        return jsonify({
            'success': False,
            'error': 'Invalid file type. Only JPG, JPEG, and PNG images are allowed.'
        }), 400

    # ── Save uploaded file ────────────────────
    safe_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    upload_path = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(upload_path)
    logger.info(f"Image saved: {upload_path}")

    # ── Run detection ─────────────────────────
    result = run_detection(upload_path)

    if result['error']:
        return jsonify({'success': False, 'error': result['error']}), 500

    return jsonify({
        'success': True,
        'original_filename': unique_name,
        'output_filename': result['output_filename'],
        'detections': result['detections'],
        'summary': result['summary'],
        'total_objects': result['total_objects'],
    })


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serves files from the uploads directory."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.errorhandler(413)
def too_large(e):
    return jsonify({'success': False, 'error': 'File too large. Maximum allowed size is 16 MB.'}), 413


@app.errorhandler(404)
def not_found(e):
    return render_template('index.html'), 404

# ─────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  🔍 Object Detection System - Flask Server")
    print("=" * 55)
    print("  Visit: http://127.0.0.1:5000")
    print("  Model: COCO 80 classes detector")
    print("  Press Ctrl+C to stop.")
    print("=" * 55)
    app.run(debug=True, host='0.0.0.0', port=5000)
