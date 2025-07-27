from pydantic import BaseModel
from typing import Optional
from datetime import date

class ProjectBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cliente: Optional[str] = None
    data_inicio: date
    data_fim: Optional[date] = None
    status: str = "em andamento"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    pass

class ProjectOut(ProjectBase):
    id: int

    class Config:
        orm_mode = True
