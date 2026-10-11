
# 🛡️ FinShield AI

### AI-Based Detection of Suspicious Financial Advertisements

**Hackathon Problem Statement: SKIT002**

FinShield AI is a financial threat intelligence platform designed to identify suspicious advertisements and social media posts promoting the sale of bank accounts, ATM cards, credit/debit cards, current accounts, and savings accounts.

The system analyzes advertisement text, approved webpage URLs, and uploaded images to identify suspicious indicators, classify risk levels, detect duplicate advertisements, and generate alerts through an investigation dashboard.

## 🚨 Problem Statement

Fraudulent financial advertisements can facilitate financial fraud, identity theft, money laundering, and unauthorized financial activities. Manually identifying such advertisements across internet platforms is time-consuming.

FinShield AI aims to automate the detection and investigation of suspicious financial advertisements using explainable risk analysis.

## 🎯 Key Features

- **Advertisement Scanner:** Analyze advertisement text and approved webpage URLs.
- **Image OCR Analysis:** Extract text from uploaded advertisement images.
- **Suspicious Keyword Detection:** Identify advertisements offering bank accounts, ATM cards, and financial credentials.
- **Risk Classification:** Categorize advertisements into Critical, High, Medium, and Low risk levels.
- **Evidence Generation:** Explain the indicators responsible for suspicious classifications.
- **Duplicate Detection:** Identify repeated advertisements and shared indicators.
- **Alert Management:** Highlight suspicious incidents for investigation.
- **Investigation Dashboard:** Monitor incidents, risk distribution, scan history, and alerts.

## 🧰 Tech Stack

| Component | Technology |
|---|---|
| Frontend | React.js, JavaScript, CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| API Communication | REST API, Axios |
| Image Processing | OCR |
| Testing | Postman |
| Tools | Git, GitHub, VS Code |
| Deployment | Render, Vercel |

## 🏗️ System Architecture

```text
Advertisement Data
       |
       v
Text / URL / Image OCR
       |
       v
Indicator Extraction
       |
       v
Risk Scoring Engine
       |
       +------> Evidence Generation
       |
       +------> Duplicate Detection
       |
       v
Risk Classification
       |
       v
MongoDB Database
       |
       v
Express REST API
       |
       v
React Investigation Dashboard
       |
       v
Alerts and Incident Monitoring
```

## 📊 Risk Classification

| Risk Level | Description |
|---|---|
| 🔴 Critical | Multiple strong indicators of potential financial abuse |
| 🟠 High | Significant suspicious indicators detected |
| 🟡 Medium | Indicators require further investigation |
| 🟢 Low | Few or no suspicious indicators detected |

Risk classifications are investigative signals and do not independently establish illegal activity.

## 🔌 Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend connectivity |
| POST | `/api/ads/analyze` | Analyze advertisement data |
| GET | `/api/ads/history` | Retrieve scan history |
| GET | `/api/ads` | Retrieve advertisement records |
| GET | `/api/ads/duplicates` | Identify duplicate advertisements |
| POST | `/ocr/upload` | Upload images for OCR processing |
| GET | `/api/alerts` | Retrieve alerts |

*These endpoints should match the routes implemented in the project.*

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB or MongoDB Atlas
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Hackathon
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL.

### 2. Start the Backend

```bash
cd backend
npm install
```

Configure the required environment variables in `.env`, then start the server:

```bash
npm run dev
```

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed in the terminal.

## 🔐 Security and Responsible Use

- Process publicly available or authorized advertisement data.
- Protect personal information and financial identifiers.
- Never commit API keys, database passwords, or `.env` files.
- Treat suspicious classifications as signals requiring human review.
- Do not bypass platform access controls or authentication.

## 🚀 Future Enhancements

- Machine-learning-based advertisement classification.
- Multilingual text and image analysis.
- Semantic similarity detection.
- Coordinated campaign identification.
- Integration with authorized threat-intelligence sources.
- Improved real-time alerting and investigation tools.

## 🎯 Expected Impact

FinShield AI aims to help analysts identify suspicious financial advertisements, prioritize high-risk incidents, discover repeated patterns, and investigate the evidence behind each classification.

## 🏆 Hackathon Details

- **Project Name:** FinShield AI
- **Problem Statement:** SKIT002
- **Domain:** Financial Security and Fraud Detection
- **Architecture:** Full-Stack Web Application
- **Core Stack:** MERN

## 📜 Disclaimer

FinShield AI is a hackathon prototype for research and investigation support. Its findings depend on available data and implemented detection rules. A flagged advertisement is not necessarily fraudulent or illegal.

---

**Built for SKIT002 — AI-Based Detection of Suspicious Financial Advertisements.**
