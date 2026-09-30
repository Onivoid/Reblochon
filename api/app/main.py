from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.auth import router as auth_router
from app.routers.extras import extras_router
from app.routers.projects import projects_router
from app.routers.tasks import tasks_router
from app.routers.teams import router as teams_router


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Reblochon API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth_router)
    app.include_router(teams_router)
    app.include_router(projects_router)
    app.include_router(tasks_router)
    app.include_router(extras_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()


def run() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.api_host, port=settings.api_port, reload=True)
