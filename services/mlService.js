const axios = require("axios");

const ML_API = process.env.ML_API_URL;

// Scam Detection — ML powered
const mlScamCheck = async (message) => {
  try {
    const res = await axios.post(`${ML_API}/ml/scam`, { message });
    return res.data;
  } catch (err) {
    console.error("ML Scam API error:", err.message);
    return null; // Gemini fallback use hoga
  }
};

// Credit Score — ML powered
const mlCreditScore = async (userData) => {
  try {
    const res = await axios.post(`${ML_API}/ml/credit`, userData);
    return res.data;
  } catch (err) {
    console.error("ML Credit API error:", err.message);
    return null;
  }
};

// Financial Health — ML powered
const mlHealthScore = async (userData) => {
  try {
    const res = await axios.post(`${ML_API}/ml/health`, userData);
    return res.data;
  } catch (err) {
    console.error("ML Health API error:", err.message);
    return null;
  }
};

// Sentiment Analysis
const mlSentiment = async (text) => {
  try {
    const res = await axios.post(`${ML_API}/ml/sentiment`, { text });
    return res.data;
  } catch (err) {
    console.error("ML Sentiment API error:", err.message);
    return null;
  }
};

// Scheme Recommender
const mlSchemeRecommend = async (userProfile) => {
  try {
    const res = await axios.post(`${ML_API}/ml/scheme`, userProfile);
    return res.data;
  } catch (err) {
    console.error("ML Scheme API error:", err.message);
    return null;
  }
};

module.exports = {
  mlScamCheck,
  mlCreditScore,
  mlHealthScore,
  mlSentiment,
  mlSchemeRecommend,
};