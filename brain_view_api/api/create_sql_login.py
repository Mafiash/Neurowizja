from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

server = "brain-view.database.windows.net"
username = "brainview_admin"
password = "sSJ84CDe$urtuBf"
driver = "ODBC Driver 18 for SQL Server"

# 1️⃣ Utwórz login w master
database = "master"
connection_string = (
    f"mssql+pyodbc://{username}:{password}@{server}:1433/{database}"
    f"?driver={driver.replace(' ', '+')}&Encrypt=yes&TrustServerCertificate=no"
)
engine = create_engine(connection_string)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
session = SessionLocal()

try:
    session.execute(text("CREATE LOGIN test_sql_user WITH PASSWORD = 'TwojeHasło123!';"))
    session.commit()
    print("Login utworzony w master!")
except Exception as e:
    print("Błąd:", e)
finally:
    session.close()

# 2️⃣ Utwórz użytkownika w brain_view_db
database = "brain_view_db"
engine = create_engine(
    f"mssql+pyodbc://{username}:{password}@{server}:1433/{database}?driver={driver.replace(' ', '+')}&Encrypt=yes&TrustServerCertificate=no"
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
session = SessionLocal()

try:
    session.execute(text("CREATE USER test_sql_user FOR LOGIN test_sql_user;"))
    session.execute(text("ALTER ROLE db_owner ADD MEMBER test_sql_user;"))
    session.commit()
    print("Użytkownik i rola utworzone w brain_view_db!")
except Exception as e:
    print("Błąd:", e)
finally:
    session.close()