from app.services.team_service import normalize_optional_text


def test_normalize_optional_text_empty():
    assert normalize_optional_text(None) is None
    assert normalize_optional_text("") is None
    assert normalize_optional_text("   ") is None


def test_normalize_optional_text_whitespace():
    assert normalize_optional_text("  Hello, World!  ") == "Hello, World!"
