from sqlalchemy import create_engine, inspect, text

url = "postgresql+psycopg2://postgres:1234@localhost:5432/VKR"

engine = create_engine(url)

with engine.connect() as conn:
    inspector = inspect(conn)
    print("Tables:", inspector.get_table_names())
    try:
        res = conn.execute(text("SELECT * FROM alembic_version;")).fetchall()
        print("alembic_version:", res)
    except Exception as e:
        print("alembic_version query failed:", e)