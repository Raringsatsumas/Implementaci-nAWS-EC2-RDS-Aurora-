from fastapi import FastAPI

app = FastAPI(title="Chinook Store API")

@app.get("/health")
def health():
    return {"status": "ok"}
