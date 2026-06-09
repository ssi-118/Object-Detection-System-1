---
title: Object Detection System
emoji: 🏆
colorFrom: indigo
colorTo: gray
sdk: docker
pinned: false
license: apache-2.0
---

# Object Detection System

A web-based object detection app powered by **YOLOv8** and **Flask**. Upload any image and get real-time bounding boxes, labels, and confidence scores for up to 80 object classes from the COCO dataset.

---

## Dataset Used

This project uses the **COCO (Common Objects in Context) Dataset**, a widely used benchmark dataset for object detection and computer vision tasks.

* **Dataset:** COCO 2017
* **Source:** https://cocodataset.org
* **Object Categories:** 80
* **Annotations:** Bounding Boxes, Segmentation Masks, and Keypoints

### Detectable Classes

The YOLOv8 model is pretrained on COCO and can detect objects such as:

* Person
* Car
* Bicycle
* Bus
* Dog
* Cat
* Chair
* Bottle
* Laptop
* Cell Phone

and 70+ additional object categories.

The pretrained YOLOv8 model leverages the COCO dataset to provide accurate real-time object detection without requiring custom training.

---

## Features

- Upload JPG or PNG images (up to 16 MB)
- Detects 80 object classes (COCO dataset)
- Bounding boxes with per-class color coding
- Confidence scores displayed on each detection
- Annotated image returned for download
- Clean, responsive web UI

---

## Project Structure

```
object-detection-system/
├── app.py                  # Flask backend + YOLO inference
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container config for deployment
├── README.md
├── model/
│   └── yolov8n.pt          # YOLOv8 nano weights (tracked via Git LFS)
├── static/
│   ├── css/
│   └── js/
├── templates/
│   └── index.html          # Frontend UI
└── uploads/                # Temp storage for uploaded/annotated images
    └── .gitkeep
```

---

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/your-username/object-detection-system.git
cd object-detection-system
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Add the model weights

Place `yolov8n.pt` inside the `model/` folder. You can download it from [Ultralytics](https://github.com/ultralytics/assets/releases):

```bash
mkdir -p model
curl -L https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.pt -o model/yolov8n.pt
```

Or let the app auto-download it on first run (requires internet).

### 5. Start the development server

```bash
python app.py
```

Visit **http://127.0.0.1:5000** in your browser.

---

## Running with Docker

### Build and run

```bash
docker build -t object-detection-system .
docker run -p 7860:7860 object-detection-system
```

Visit **http://localhost:7860**

---

## Deployment

### Hugging Face Spaces

1. Create a new Space at [huggingface.co](https://huggingface.co/new-space)
   - SDK: **Docker**

2. Install Git LFS (required for the `.pt` model file):

```bash
git lfs install
git lfs track "*.pt"
git add .gitattributes
```

3. Push your code:

```bash
git init
git remote add origin https://huggingface.co/spaces/your-username/object-detection-system
git add .
git commit -m "initial commit"
git push origin main
```

The app will be live at `https://your-username-object-detection-system.hf.space`

> **Note:** The port in `Dockerfile` must be `7860` for HF Spaces. The provided Dockerfile already handles this.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| Flask | 3.0.3 | Web framework |
| gunicorn | 22.0.0 | Production WSGI server |
| ultralytics | 8.2.0 | YOLOv8 model |
| torch | 2.5.1 | Deep learning backend |
| torchvision | 0.20.1 | Vision utilities |
| Pillow | ≥10.0.1 | Image processing |
| numpy | ≥1.24.3 | Numerical operations |
| opencv-python-headless | ≥4.8.0 | Image I/O (headless for server) |

---

## Model Details

| Property          | Value                                           |
| ----------------- | ----------------------------------------------- |
| Model             | YOLOv8 Nano (YOLOv8n)                           |
| Framework         | Ultralytics YOLO                                |
| Training Dataset  | COCO 2017                                       |
| Number of Classes | 80                                              |
| Task              | Object Detection                                |
| Input Type        | RGB Images                                      |
| Output            | Bounding Boxes, Class Labels, Confidence Scores |
| Inference Device  | CPU / GPU                                       |
| Deployment        | Flask + Docker + Hugging Face Spaces            |

### Performance Characteristics

* Lightweight and optimized for real-time inference
* Suitable for CPU-based deployment
* Fast prediction speeds on free-tier cloud platforms
* Detects multiple objects simultaneously within a single image
* Supports confidence-based filtering of predictions

---

## Live Demo
```
https://soha118-object-detection-system.hf.space
```
---

## License

MIT License. See [LICENSE](LICENSE) for details.
