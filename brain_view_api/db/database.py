import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from dotenv import load_dotenv 
import os 
app = FastAPI()


dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config", ".env")
load_dotenv(dotenv_path)

server = os.getenv("SERVER_URL")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USERNAME")
password = os.getenv("DB_USERNAME_PASSWORD")
print(server, database, username, password)
driver = "ODBC Driver 18 for SQL Server"

connection_string = (
    f"mssql+pyodbc://{username}:{password}@{server}:1433/{database}"
    f"?driver={driver.replace(' ', '+')}&Encrypt=yes&TrustServerCertificate=no"
)

engine = create_engine(connection_string)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/testtable")
def get_testtable(db: Session = Depends(get_db)):
    result = db.execute("SELECT TOP 5 * FROM dbo.TestTable")
    return [dict(row._mapping) for row in result]


