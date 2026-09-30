from types import SimpleNamespace
from uuid import uuid4

from app.domain.enums import TaskStatus
from app.services.project_service import status_for_column


def test_status_for_column_done():
    column = SimpleNamespace(id=uuid4(), is_done=True, position=2.0)
    assert status_for_column(column, [column]) == TaskStatus.DONE


def test_status_for_column_first_open_is_todo():
    first = SimpleNamespace(id=uuid4(), is_done=False, position=0.0)
    second = SimpleNamespace(id=uuid4(), is_done=False, position=1.0)
    done = SimpleNamespace(id=uuid4(), is_done=True, position=2.0)
    assert status_for_column(first, [first, second, done]) == TaskStatus.TODO
    assert status_for_column(second, [first, second, done]) == TaskStatus.DOING


def test_status_for_column_none():
    assert status_for_column(None, []) == TaskStatus.TODO
