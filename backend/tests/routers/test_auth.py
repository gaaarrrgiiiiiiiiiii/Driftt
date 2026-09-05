import pytest
from app.core.auth import hash_password, verify_password, create_token, decode_token


def test_password_hashing():
    password = "secret_password_123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_flow():
    user_id = "12345678-1234-5678-1234-567812345678"
    token = create_token(user_id)
    assert isinstance(token, str)
    assert len(token) > 20

    decoded_id = decode_token(token)
    assert decoded_id == user_id


def test_invalid_jwt_token():
    invalid_token = "invalid.token.string"
    with pytest.raises(Exception):
        decode_token(invalid_token)
