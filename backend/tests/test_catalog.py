from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db


class FakeMappings:
    def __init__(self, first=None, all_rows=None):
        self._first = first
        self._all_rows = all_rows or []

    def first(self):
        return self._first

    def all(self):
        return self._all_rows


class FakeResult:
    def __init__(self, first=None, all_rows=None, rowcount=1):
        self._first = first
        self._all_rows = all_rows or []
        self.rowcount = rowcount

    def mappings(self):
        return FakeMappings(first=self._first, all_rows=self._all_rows)

    def first(self):
        return self._first


class FakeCatalogDB:
    def execute(self, stmt, params=None):
        sql = str(stmt)
        if "FROM Track t" in sql:
            return FakeResult(
                all_rows=[
                    {
                        "TrackId": 1,
                        "TrackName": "Love Song",
                        "UnitPrice": 0.99,
                        "AlbumTitle": "Album 1",
                        "ArtistName": "Artist 1",
                        "GenreName": "Rock",
                    }
                ]
            )
        raise AssertionError(f"SQL no esperada: {sql}")

    def commit(self):
        pass

    def rollback(self):
        pass


def override_db():
    return FakeCatalogDB()


def test_tracks_search_returns_items():
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    try:
        r = client.get("/v1/tracks?query=Love")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert len(data["items"]) == 1
        assert data["items"][0]["TrackName"] == "Love Song"
        assert data["items"][0]["ArtistName"] == "Artist 1"
    finally:
        app.dependency_overrides = {}
