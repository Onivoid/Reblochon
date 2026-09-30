from fastapi.testclient import TestClient


def _bootstrap_project(client: TestClient, register_user) -> tuple[dict, str, str, list[dict]]:
    data = register_user(display_name="Alice")
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    team_id = client.get("/teams", headers=headers).json()[0]["id"]
    project_id = client.get(f"/teams/{team_id}/projects", headers=headers).json()[0]["id"]
    columns = client.get(f"/projects/{project_id}/columns", headers=headers).json()
    return data, headers, project_id, columns


def test_depends_on_self_link_returns_400(client: TestClient, register_user):
    _data, headers, project_id, _columns = _bootstrap_project(client, register_user)

    task = client.post(
        f"/projects/{project_id}/tasks",
        headers=headers,
        json={"title": "Task A"},
    )
    assert task.status_code == 200
    task_id = task.json()["id"]

    response = client.post(
        f"/tasks/{task_id}/links",
        headers=headers,
        json={"to_task_id": task_id, "link_type": "depends_on"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "self_link"


def test_depends_on_marks_task_blocked_until_dependency_done(client: TestClient, register_user):
    _data, headers, project_id, columns = _bootstrap_project(client, register_user)
    done_column = next(c for c in columns if c["is_done"])

    task_a = client.post(
        f"/projects/{project_id}/tasks",
        headers=headers,
        json={"title": "Blocked task"},
    )
    task_b = client.post(
        f"/projects/{project_id}/tasks",
        headers=headers,
        json={"title": "Dependency"},
    )
    assert task_a.status_code == 200
    assert task_b.status_code == 200
    task_a_id = task_a.json()["id"]
    task_b_id = task_b.json()["id"]

    link = client.post(
        f"/tasks/{task_a_id}/links",
        headers=headers,
        json={"to_task_id": task_b_id, "link_type": "depends_on"},
    )
    assert link.status_code == 200

    blocked = client.get(f"/tasks/{task_a_id}", headers=headers)
    assert blocked.status_code == 200
    assert blocked.json()["is_blocked"] is True

    complete_b = client.patch(
        f"/tasks/{task_b_id}",
        headers=headers,
        json={"column_id": done_column["id"], "status": "done"},
    )
    assert complete_b.status_code == 200

    unblocked = client.get(f"/tasks/{task_a_id}", headers=headers)
    assert unblocked.status_code == 200
    assert unblocked.json()["is_blocked"] is False
