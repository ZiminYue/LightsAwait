# LightsAwait Demo
A demo that demonstrates intuitive interface design and simulates how a chatbot works in **a domestic violence reporting platform** with script logic, from front-end to back-end.

---

### Latest Updates

Cleaned up the codes🧹

---
### Features of LightsAwait Demo

1. **Intuitive Interactive Interface** - Clear homepage buttons that directly lead to corresponding functions (URL bar displays hints for intended functionality when clicked)

2. **User-friendly Help System** - Humanized chatbot designed to assist users with low digital literacy in accessing features. This demo simulates chatbot functionality through pure code implementation without external AI models

3. **Admin Dashboard** - Backend view displaying the operational mechanics behind some of the chatbot's functions



### Features of Lighty the Chatbot

1. **Clear visibility** - Easy to notice and access from the homepage
   
2. **Supportive conversation initiation** - Starts with caring messages to guide users into conversation
   
3. **Transparency & data security assurance** - Provides guidance and explanation on AI functionality and guarantees personal information protection through dialogue
   
4. **Trigger word detection** - Automatically detects certain keywords to access the reporting system
   
5. **Custom help codes** - Allows users to create personalized code words for their safety vocabulary
   
6. **Security verification** - Performs identity checks with custom codes created before when accessing sensitive information

---

### To run:

## Prerequisites
- Node.js (Download and install from [nodejs.org](https://nodejs.org/) if not already installed)

## Setup Instructions
**Note: The following commands should be run in your terminal/command prompt**

## 1. Clone the repository

```bash
git clone https://github.com/ZiminYue/LightsAwait.git
cd <your-project-folder>
```
## 2. Install dependencies

```bash
npm install
```
## 3. Run the server

```bash
node server/server.js
```
## 4. Open in browser

After starting the server, open your browser and go to:
```
http://localhost:3000
```

---
### Project Structure
```
  📁 LightsAwait/
  ├── public/
  │   ├── assets
  │   │   └── Lighty's GIFs
  │   ├── index.html
  │   ├── chatbot.html
  │   └── admin.html
  ├── server/
  │   ├── server.js
  │   └── data/
  │       ├── custom_codes.json
  │       ├── flagged.json
  │       ├── trigger_words.json
  │       └── reaction_keywords.json
  ├── node_modules/    # Installed with npm install in Step 2
  ├── package.json
  ├── package-lock.json 
  └── README.md
```
---

### LLM Disclaimer

This project was developed with coding assistance from ChatGPT, Claude, and Gemini. No third-party code libraries or external AI models were used in the implementation.
