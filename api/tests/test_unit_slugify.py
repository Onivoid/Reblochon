import re

from app.services.team_service import slugify

NAME = "Mon Équipe !!"
HEX_SUFFIX = re.compile(r"^[0-9a-f]{6}$")


def test_slugify_uniqueness():
    assert slugify(NAME) != slugify(NAME)


def test_slugify_minimization():
    result = slugify(NAME)
    assert result == result.lower()


def test_slugify_spaceless():
    assert " " not in slugify(NAME)


def test_slugify_have_dashes():
    assert "-" in slugify(NAME)


def test_slugify_have_no_double_dashes():
    result = slugify(NAME)
    body, _suffix = result.rsplit("-", 1)
    assert "--" not in body


def test_slugify_have_a_6hex_suffix():
    suffix = slugify(NAME).rsplit("-", 1)[-1]
    assert HEX_SUFFIX.fullmatch(suffix)
