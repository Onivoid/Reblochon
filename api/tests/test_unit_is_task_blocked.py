from app.domain.enums import TaskStatus
from app.services.task_service import is_task_blocked


def test_is_task_blocked_no_dependencies():
    assert is_task_blocked([]) is False


def test_is_task_blocked_all_done():
    assert is_task_blocked([TaskStatus.DONE]) is False


def test_is_task_blocked_open_dependency():
    assert is_task_blocked([TaskStatus.TODO]) is True


def test_is_task_blocked_mixed_dependencies():
    assert is_task_blocked([TaskStatus.DONE, TaskStatus.DOING]) is True
