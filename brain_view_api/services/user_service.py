from brain_view_api.models.user import User

_users = [
    User(id=1, name="Alice", email="alice@example.com"),
    User(id=2, name="Bob", email="bob@example.com"),
]

def get_users(user_id: int = None):
    if user_id:
        return next((u for u in _users if u.id == user_id), None)
    return _users