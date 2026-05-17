#!/bin/bash
# ============================================
# SmartX Backend — GitHub Setup Script
# Run: chmod +x setup-github.sh && ./setup-github.sh
# ============================================

echo "⬡  SmartX Backend — GitHub Setup"
echo "=================================="

# Check git installed
if ! command -v git &> /dev/null; then
  echo "❌ Git not found. Install git first."
  exit 1
fi

# Initialize git
git init
echo "✅ Git initialized"

# Add all files
git add .
echo "✅ Files staged"

# Initial commit
git commit -m "feat: initial production-grade SmartX backend

- Express.js REST API with 23+ endpoints
- JWT auth with OTP email verification  
- Socket.io real-time chat with presence
- Groq AI (Llama 3.3) integration with retry logic
- Cloudinary image upload service
- MongoDB with optimized indexes
- Winston logging + centralized error handling
- Helmet, CORS, rate limiting security"

echo "✅ Initial commit created"

echo ""
echo "📋 NEXT STEPS:"
echo "1. Create repo at https://github.com/new"
echo "2. Run: git remote add origin https://github.com/YOUR_USERNAME/smartx-backend.git"
echo "3. Run: git branch -M main"
echo "4. Run: git push -u origin main"
echo ""
echo "🚀 Done! Your SmartX project is ready for GitHub."
