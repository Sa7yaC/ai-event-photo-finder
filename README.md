# AI-Powered Event Photo Platform

A production-minded, privacy-preserving event photo-sharing platform powered by facial recognition and vector similarity search. Attendees take a selfie, and the application identifies and retrieves all photographs from the event containing their face — including group photos — without manual tagging or public photo browsing.

---

## Architecture Overview

```
photo-finder/
├── frontend/                   # Next.js 15+ App Router, React, TypeScript, Tailwind CSS, Lucide
│   ├── src/app/                # App router routes & pages
│   ├── public/                 # Static assets
│   └── package.json
├── backend/                    # Python FastAPI modular backend
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (versioned /api/v1)
│   │   │   └── health.py       # Non-sensitive health telemetry
│   │   ├── core/               # App configuration, database session handling
│   │   ├── models/             # SQLAlchemy 2.x domain models (Stage 2)
│   │   ├── schemas/            # Pydantic request & response schemas
│   │   ├── services/           # Business logic & event operations
│   │   ├── ai/                 # Face recognition provider adapter abstraction
│   │   ├── storage/            # Pluggable image storage interface
│   │   └── main.py             # FastAPI entrypoint and lifespan management
│   ├── tests/                  # Pytest test suite with async HTTP client
│   ├── requirements.txt        # Backend dependencies
│   └── Dockerfile              # Containerized backend
├── docker-compose.yml          # PostgreSQL 16 + pgvector & backend composition
├── .env.example                # Environment variables template
├── .gitignore                  # Git exclusions for secrets, venv, and binary media
└── README.md                   # System documentation & setup guide
```

---

## Prerequisites

- **Python 3.11+** (Python 3.13 tested)
- **Node.js 18+** (Node v26 tested) with `npm`
- **Docker** and **Docker Compose** (for PostgreSQL + pgvector container)

---

## Quickstart & Local Development

### 1. Environment Configuration

Copy the example environment template:
```bash
cp .env.example .env
```

### 2. Database Infrastructure (Docker Compose)

Start the PostgreSQL service with the `pgvector` extension:
```bash
docker compose up -d db
```
To run both backend and database via Docker Compose:
```bash
docker compose up -d
```

### 3. Backend Setup (Local Virtual Environment)

Navigate to `backend`:
```bash
cd backend
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# On Linux / macOS:
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

Run the backend development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/api/v1/docs`
- Health Telemetry: `http://localhost:8000/api/v1/health`

### 4. Frontend Setup

Open a new terminal and navigate to `frontend`:
```bash
cd frontend
npm install
npm run dev
```
- Frontend Web App: `http://localhost:3000`

---

## Automated Testing

Execute the backend automated test suite:
```bash
cd backend
.\.venv\Scripts\pytest.exe -v
```
*(On Linux/macOS: `pytest -v`)*

---

## Database Migrations

Database schema migrations are managed via Alembic:
```bash
cd backend
.\.venv\Scripts\alembic.exe upgrade head
```

---

## API Endpoints (Stage 3)

### Health
- `GET /api/v1/health`: Non-sensitive health status and database connectivity.

### Events
- `POST /api/v1/events`: Create an event. Returns event metadata + secret `organizer_token`.
- `GET /api/v1/events`: List events for organizer dashboard.
- `GET /api/v1/events/{event_id}`: Retrieve public event metadata.
- `GET /api/v1/events/by-slug/{slug}`: Public event lookup for attendee QR codes and links.
- `GET /api/v1/events/{event_id}/stats`: Real-time event statistics (total, processed, pending, failed photos, **detected faces**).

### Photo Ingestion & Storage
- `POST /api/v1/events/{event_id}/photos`: Multi-photo upload (requires `X-Organizer-Token`). Validates magic bytes (JPEG/PNG/WEBP), enforces 15MB limits, deduplicates via SHA-256. **Stage 3: automatically indexes face embeddings after each upload.**
- `GET /api/v1/events/{event_id}/photos`: Paginated list of event photos for the organizer gallery (requires `X-Organizer-Token`).
- `GET /api/v1/photos/{photo_id}`: Retrieve photo metadata.
- `GET /api/v1/photos/{photo_id}/download`: Stream original photo file from persistent local storage.
- `DELETE /api/v1/photos/{photo_id}`: Delete photograph record, storage file, and all face embeddings (requires `X-Organizer-Token`).

### Attendee Selfie Search (Stage 3 — NEW)
- `POST /api/v1/events/{event_id}/search`: Upload a selfie to find all photos in the event containing your face.
  - **Body**: `multipart/form-data` with field `selfie` (JPEG/PNG/WEBP, ≤10 MB).
  - **Query params**: `tolerance` (0.3–0.9, default 0.6), `limit` (1–200, default 50).
  - **Returns**: `SelfieSearchResponse` — list of matching photos sorted by similarity confidence.
  - **Privacy**: Selfie is processed in memory only — never stored.

---

## Face Recognition Setup (Stage 3)

Face recognition uses [dlib](http://dlib.net/) via the [`face_recognition`](https://github.com/ageitgey/face_recognition) Python library (128-d HOG-based embeddings). Face vectors are stored in PostgreSQL using the `pgvector` extension.

### Installing `face_recognition`

```bash
# Windows (Python 3.13 precompiled wheel):
pip install setuptools<70
pip install "https://raw.githubusercontent.com/z-mahmud22/Dlib_Windows_Python3.x/main/dlib-20.0.99-cp313-cp313-win_amd64.whl"
pip install face-recognition

# Linux / macOS
pip install face-recognition
```

> **Note**: The backend runs without `face_recognition` installed — photos will be uploaded and stored, but face indexing will be skipped (photos will be marked `completed` with 0 detected faces). Install the library to enable the full AI search pipeline.

### Vector Search Architecture
- **Embedding**: 128-d float32 dlib face encoding per detected face (compatible with L2 distance).
- **Storage**: `face_embeddings` table with `pgvector(128)` column.
- **Index**: IVFFlat index (`vector_l2_ops`, `lists=100`) for sub-linear ANN search.
- **Search**: `<->` pgvector L2 operator for nearest-neighbour retrieval, Python-side distance threshold filtering.

---

## Security & Biometric Privacy Principles

1. **Organizer Authorization**: Administrative actions (photo upload, photo deletion, organizer gallery) are secured with an unguessable `organizer_token` validated via constant-time comparison.
2. **Path Traversal Prevention**: Storage operations strictly canonicalize and validate all file paths against the base directory.
3. **MIME & Magic Byte Verification**: Uploads are validated by decoding image headers via Pillow rather than blindly trusting file extensions.
4. **Event Scoping**: Photos, storage directories, queries, and face embeddings are strictly scoped to the event UUID.
5. **Deduplication**: Content hashing prevents duplicate uploads from wasting storage or creating redundant processing jobs.
6. **Selfie Privacy**: Attendee selfies submitted for search are processed entirely in memory — they are never written to disk or stored in the database.
7. **Cascade Deletion**: Deleting a photo or event cascade-deletes all associated face embeddings from the database.

