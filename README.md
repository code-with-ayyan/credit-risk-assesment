# Credit Risk Assessment

An end-to-end machine learning project that predicts whether a loan applicant is likely to **default**. It includes a trained and calibrated XGBoost model, a FastAPI backend that serves predictions, and a React frontend for entering applicant details and viewing the risk result.

**Live Demo:** [https://ayyan-credit-risk.duckdns.org/](https://ayyan-credit-risk.duckdns.org/)
Hosted on an **AWS EC2** instance.

---

## Features

- Predicts the **probability of default** for a loan application
- Classifies each applicant as **High Risk** or **Low Risk** using a tuned decision threshold
- Handles class imbalance, missing values and outliers
- Probability calibration so the output behaves like a real probability
- Model explainability with **SHAP** (global and local explanations)
- Input validation using Pydantic
- Clean, responsive React + Tailwind interface
- Deployed on AWS EC2

---

## Tech Stack

| Layer | Tools |
|---|---|
| Machine Learning | Python, Pandas, NumPy, Scikit-learn, XGBoost, SHAP, Matplotlib, Seaborn |
| Backend | FastAPI, Uvicorn, Pydantic, Joblib |
| Frontend | React 18, Vite, Tailwind CSS 4, Lucide React |
| Deployment | AWS EC2, DuckDNS |

---

## Project Structure

```
credit-risk-assesment/
├── app.py                     
├── main.ipynb                 
├── credit_risk_dataset.csv    
├── requirements.txt           
├── pickle_files/
│   ├── model.pkl              
│   └── threshold.pkl         
└── frontend/                  
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env                   
    └── package.json
```

---

## Dataset

The dataset contains **32,581 loan records** with 11 input features and one target column, `loan_status` (1 = default, 0 = no default). About **21.8%** of the loans are defaults, so the data is imbalanced.

| Feature | Description |
|---|---|
| `person_age` | Applicant's age |
| `person_income` | Annual income |
| `person_home_ownership` | RENT, MORTGAGE, OWN or OTHER |
| `person_emp_length` | Employment length in years |
| `loan_intent` | Purpose of the loan (education, medical, venture, personal, debt consolidation, home improvement) |
| `loan_grade` | Loan grade from A to G |
| `loan_amnt` | Loan amount |
| `loan_int_rate` | Interest rate |
| `loan_percent_income` | Loan amount as a share of income |
| `cb_person_default_on_file` | Previous default on file (Y/N) |
| `cb_person_cred_hist_length` | Credit history length in years |

---

## Machine Learning Workflow

All steps are documented in `main.ipynb`.

1. **Exploratory data analysis:** class distribution, boxplots, correlation heatmap, missing value check.
2. **Data cleaning:**
   - Removed duplicate rows
   - Removed unrealistic ages (below 18 or above 100)
   - Removed unrealistic employment lengths (above 60 years or greater than age)
3. **Preprocessing (Scikit-learn pipelines):**
   - Numeric: median imputation (plus scaling for Logistic Regression)
   - Categorical: constant imputation and one-hot encoding
4. **Class imbalance:** handled with `scale_pos_weight` (XGBoost) and `class_weight="balanced"` (Logistic Regression, Random Forest).
5. **Model comparison** using 5-fold stratified cross-validation:

   | Model | ROC-AUC | F1 |
   |---|---|---|
   | Logistic Regression | 0.871 | 0.641 |
   | XGBoost | 0.944 | 0.816 |

6. **Hyperparameter tuning:** `RandomizedSearchCV` (150 iterations, 5-fold CV, scored on average precision).
7. **Threshold optimization:** the decision threshold is tuned on the precision-recall curve instead of using the default 0.5.
8. **Probability calibration:** `CalibratedClassifierCV` (sigmoid, 5-fold) is applied on top of XGBoost.
9. **Explainability:** SHAP summary plot (global) and waterfall plot (single prediction).

### Test Set Results (XGBoost with tuned threshold)

| Metric | Score |
|---|---|
| Accuracy | 0.94 |
| Precision (default class) | 0.92 |
| Recall (default class) | 0.78 |
| F1 (default class) | 0.84 |

The final saved model is the calibrated XGBoost pipeline together with the saved threshold (`≈ 0.645`).

---

## API Reference

The backend is built with FastAPI and loads the model once at startup.

### `GET /`
Simple health check.

### `POST /predict`
Returns the default probability and risk label for one applicant.

**Request body**

```json
{
  "person_age": 25,
  "person_income": 55000,
  "person_home_ownership": "RENT",
  "person_emp_length": 4,
  "loan_intent": "EDUCATION",
  "loan_grade": "B",
  "loan_amnt": 10000,
  "loan_int_rate": 11.5,
  "loan_percent_income": 0.18,
  "cb_person_default_on_file": "N",
  "cb_person_cred_hist_length": 3
}
```

**Response**

```json
{
  "default_probability": 0.1234,
  "default_prediction": 0,
  "threshold": 0.6448,
  "result": "Low Risk"
}
```

**Validation rules**

- `person_age` must be 18 or above
- Numeric fields cannot be negative
- `person_home_ownership`: `RENT`, `MORTGAGE`, `OWN`, `OTHER`
- `loan_intent`: `EDUCATION`, `MEDICAL`, `VENTURE`, `PERSONAL`, `DEBTCONSOLIDATION`, `HOMEIMPROVEMENT`
- `loan_grade`: `A` to `G`
- `cb_person_default_on_file`: `Y` or `N`

Interactive API docs are available at `/docs` when the server runs locally.

---

## Run Locally

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
git clone https://github.com/<your-username>/credit-risk-assesment.git
cd credit-risk-assesment

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The API runs at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
```

Create or edit `frontend/.env`:

```
VITE_API_URL=http://localhost:8000
```

Then start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

---

## Deployment (AWS EC2)

The project is deployed on an **AWS EC2** instance and is reachable through a free **DuckDNS** domain.

General steps followed:

1. Launch an EC2 instance and open the required ports in the security group (SSH, HTTP/HTTPS, API port).
2. Install Python and project dependencies on the instance.
3. Run the FastAPI app with Uvicorn.
4. Build the React frontend (`npm run build`) and serve it.
5. Point the DuckDNS domain to the instance's public IP.

---

## Future Improvements

- Add batch prediction (CSV upload)
- Show SHAP explanations for each prediction in the UI
- Containerize the app with Docker
- Add automated tests and a CI/CD pipeline
- Restrict CORS to the frontend domain in production

---

## Author

**Ayyan**
Backend Developer and AI Engineering student

---

## Disclaimer

This project is for educational and portfolio purposes. It should not be used as the only basis for real lending decisions.
