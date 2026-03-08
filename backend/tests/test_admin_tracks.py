from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db
from app.routers.admin_tracks import require_admin


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


class FakeAdminDB:
    def execute(self, stmt, params=None):
        sql = str(stmt)

        if "UPDATE Track" in sql:
            return FakeResult(rowcount=1)

        if "DELETE FROM InvoiceLine" in sql:
            return FakeResult(rowcount=0)

        if "DELETE FROM PlaylistTrack" in sql:
            return FakeResult(rowcount=0)

        if "DELETE FROM Track" in sql:
            return FakeResult(rowcount=1)

        raise AssertionError(f"SQL no esperada: {sql}")

    def commit(self):
        pass

    def rollback(self):
        pass


def override_db():
    return FakeAdminDB()


def override_admin():
    return {"id": 1, "username": "admin", "role": "admin"}


def test_admin_update_track_success():
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = override_admin
    client = TestClient(app)

    try:
        r = client.put(
            "/v1/admin/tracks/1",
            json={"name": "Nuevo Nombre", "unit_price": 1.99},
        )
        assert r.status_code == 200
    finally:
        app.dependency_overrides = {}


def test_admin_delete_track_success():
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[require_admin] = override_admin
    client = TestClient(app)

    try:
        r = client.delete("/v1/admin/tracks/1")
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
    finally:
        app.dependency_overrides = {}
