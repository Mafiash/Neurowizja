
import sys
import os

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from brain_view_api.db.database import engine
from sqlalchemy import text

def migrate():
    print("🚀 Starting database migration...")
    try:
        with engine.connect() as conn:
            # SQL Server syntax to change column type
            print("Changing column 'slice_index' to FLOAT in table 'Annotations'...")
            
            # Using raw SQL for the migration
            conn.execute(text("ALTER TABLE Annotations ALTER COLUMN slice_index FLOAT NOT NULL"))
            conn.commit()
            
            print("✅ Migration successful: 'slice_index' is now a FLOAT.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\nPossible reasons:")
        print("1. The column 'slice_index' doesn't exist (maybe person already renamed it to 'slice'?)")
        print("2. Insufficient permissions to alter the table.")
        print("3. Database connectivity issues.")

if __name__ == "__main__":
    migrate()
