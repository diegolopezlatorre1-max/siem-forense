import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from sqlalchemy import create_engine, String, Text, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy import UniqueConstraint

load_dotenv()

USUARIO = os.environ.get("POSTGRES_USER", "siem")
CLAVE = os.environ.get("POSTGRES_PASSWORD", "")
BASE = os.environ.get("POSTGRES_DB", "siem")
HOST = os.environ.get("POSTGRES_HOST", "localhost")
PUERTO = os.environ.get("POSTGRES_PORT", "5432")

URL = f"postgresql+psycopg://{USUARIO}:{CLAVE}@{HOST}:{PUERTO}/{BASE}"

motor = create_engine(URL)
Sesion = sessionmaker(bind=motor)


class Base(DeclarativeBase):
    pass


class Evento(Base):
    __tablename__ = "eventos"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    host: Mapped[str] = mapped_column(String(120))
    source: Mapped[str] = mapped_column(String(60))
    event_type: Mapped[str] = mapped_column(String(60), index=True)
    usuario: Mapped[str | None] = mapped_column(String(120), nullable=True)
    src_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    severity: Mapped[str] = mapped_column(String(20), default="low")
    raw: Mapped[str] = mapped_column(Text)
    recibido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    
class Alerta(Base):
    __tablename__ = "alertas"
    __table_args__ = (UniqueConstraint("regla_id", "clave", "ts"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    regla_id: Mapped[str] = mapped_column(String(30), index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    severidad: Mapped[str] = mapped_column(String(10))
    mitre: Mapped[str] = mapped_column(String(20))
    clave: Mapped[str] = mapped_column(String(100))
    cantidad: Mapped[int]
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


def crear_tablas():
    Base.metadata.create_all(motor)


if __name__ == "__main__":
    crear_tablas()
    print("Tablas creadas:", list(Base.metadata.tables.keys()))
