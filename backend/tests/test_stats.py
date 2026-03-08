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


class FakeStatsDB:
    def execute(self, stmt, params=None):
        sql = str(stmt)

        if "FROM Artist ar" in sql:
            return FakeResult(
                all_rows=[
                    {
                        "ArtistId": 1,
                        "ArtistName": "U2",
                        "AlbumCount": 3,
                        "TrackCount": 25,
                    }
                ]
            )

        if "FROM Genre g" in sql:
            return FakeResult(
                all_rows=[
                    {
                        "GenreId": 1,
                        "GenreName": "Rock",
                        "TrackCount": 120,
                    }
                ]
            )

        raise AssertionError(f"SQL no esperada: {sql}")

    def commit(self):
        pass

    def rollback(self):
        pass


def override_db():
    return FakeStatsDB()


def test_stats_artists_returns_items():
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    try:
        r = client.get("/v1/stats/artists?query=")
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["ArtistName"] == "U2"
        assert data["items"][0]["AlbumCount"] == 3
    finally:
        app.dependency_overrides = {}


def test_stats_genres_returns_items():
    app.dependency_overrides[get_db] = override_db
    client = TestClient(app)

    try:
        r = client.get("/v1/stats/genres?query=")
        assert r.status_code == 200
        data = r.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["GenreName"] == "Rock"
        assert data["items"][0]["TrackCount"] == 120
    finally:
        app.dependency_overrides = {}
