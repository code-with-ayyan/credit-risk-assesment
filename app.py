from fastapi import FastAPI
from pydantic import BaseModel, Field
import pandas as pd
import joblib
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import Literal

ml_model = {} 



@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model['model'] = joblib.load('pickle_files/model.pkl')
    ml_model['threshold'] = joblib.load('pickle_files/threshold.pkl')

    yield

    ml_model.clear()
    
    

app = FastAPI(lifespan=lifespan)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoanApplication(BaseModel): #Pydantic Model
    
    
    person_age                 : int = Field(ge= 18)
    person_income              : float = Field(ge=0)
    person_home_ownership      : Literal['RENT', 'MORTGAGE', 'OWN', 'OTHER']
    person_emp_length          : float = Field(ge= 0)
    loan_intent                : Literal['EDUCATION', 'MEDICAL', 'VENTURE', 'PERSONAL', 'DEBTCONSOLIDATION','HOMEIMPROVEMENT']
    loan_grade                 : Literal['A', 'B', 'C', 'D', 'E', 'F', 'G']
    loan_amnt                  : int = Field(ge= 0)
    loan_int_rate              : float = Field(ge= 0)
    loan_percent_income        : float = Field(ge= 0)
    cb_person_default_on_file  : Literal['N', 'Y']  
    cb_person_cred_hist_length : int = Field(ge= 0)
    
    
class ResponseModel(BaseModel):
    
    default_probability : float
    default_prediction  : int
    threshold           : float
    result              : str
    
@app.get('/')
def greet():
    
    return "Hello World"  
    
@app.post('/predict')
def predict(data : LoanApplication, response_model=ResponseModel):
    
    
    input_dict = data.model_dump()
    input_df = pd.DataFrame([input_dict])

    probability = ml_model['model'].predict_proba(input_df)[:, 1][0]

    prediction = int(probability >= ml_model["threshold"])

    return ResponseModel(
        default_probability = round(probability, 4),
        default_prediction  = prediction,
        threshold           = ml_model["threshold"],
        result              = "High Risk" if prediction == 1 else "Low Risk"
    )



