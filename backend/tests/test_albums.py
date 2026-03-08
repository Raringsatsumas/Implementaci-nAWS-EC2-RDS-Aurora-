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
    def __init__(self, first=None, all_rows=None):
        self._first = first
        self._all_rows = all_rows or []

    def mappings(self):
        return FakeMappings(first=self._first, all_rows=self._all_rows)

    def first(self):
        return self._first


class FakeAlbumsDB:
    def execute(self, stmt, params=None):
        sql = str(stmt)

        if "FROM Album" in sql:
            return FakeResult(
                all_rows=[
                    {
                        "AlbumId": 1,
                        "Title": "War",
                        "ArtistId": 1,
                    },
                    {
                        "AlbumId": 2,
                        "Title": "The Joshua Tree",
                        "ArtistId": 1,
                    },
                ]
            )

        raise AssertionError(f"SQL no esperada: {sql}")

    def commit(self):
        pass

    def rollback(self):
        pass


def override_db():
    return FakeAlbumsDB()


def test_albums_by_artist_returns_items():
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    try:
        r = client.get("/v1/albums?artist_id=1&query=")
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) == 2
        assert data["items"][0]["Title"] == "War"
    finally:
        app.dependency_overrides = {}
