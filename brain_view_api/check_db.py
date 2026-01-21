
from brain_view_api.db.database import engine, SessionLocal
from brain_view_api.models.user import User, DBSession
from sqlalchemy import inspect

def check():
    try:
        print("Connecting to database...")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Tables found: {tables}")
        
        db = SessionLocal()
        try:
            user_count = db.query(User).count()
            print(f"User count: {user_count}")
            
            session_count = db.query(DBSession).count()
            print(f"Session count: {session_count}")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check()
