import sys
import os
from sqlalchemy import create_engine, text

# Add parent directory to path to import config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from brain_view_api.db.database import engine

def migrate():
    print("Running migration: Adding snapshot_path column to Annotations table...")
    try:
        with engine.connect() as connection:
            # Check if column exists first (SQL Server specific info schema)
            check_sql = text("SELECT COL_LENGTH('Annotations', 'snapshot_path')")
            result = connection.execute(check_sql).scalar()
            
            if result is None:
                alter_sql = text("ALTER TABLE Annotations ADD snapshot_path NVARCHAR(512) NULL")
                connection.execute(alter_sql)
                connection.commit()
                print("✅ specific column snapshot_path added successfully.")
            else:
                print("ℹ️ Column snapshot_path already exists.")
                
    except Exception as e:
        print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate()
