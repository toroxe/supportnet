from sqlalchemy import text
from sqlalchemy import create_engine

# Detta är en fungerande connection string
DATABASE_URL = "mysql+pymysql://root:frejaHund@localhost:3307/supportnet"

def test_connection():
    try:
        # Skapa en databasanslutning
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            print("Connection successful!")
            
            # Visa tabeller
            print("\nTabeller i databasen:")
            result = connection.execute(text("SHOW TABLES;"))
            for row in result:
                print(row)

            # Testa en enkel INSERT och SELECT
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS test_table (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(50)
                );
            """))
            connection.execute(text("INSERT INTO test_table (name) VALUES ('Test User');"))
            print("\nData i test_table:")
            data = connection.execute(text("SELECT * FROM test_table;"))
            for row in data:
                print(row)

    except Exception as e:
        print("Connection failed:", e)

if __name__ == "__main__":
    test_connection()


