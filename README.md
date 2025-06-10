# LightsAwait Demo
A simple demo that demonstrates some interface design and simulates how the chatbot in an anti-domestic violence platform works from front-end to back-end.

### Latest Updates

1. Messages can be add into flagged messages after confirming to access reporting system

2. The message with trigger words can be added to flagged message too

3. The security check process can be run

### Latest Issues

Need to make sure the answer itself won't trigger any words


### Feature Checklist

1.Being clearly visible on the homepage ☒

2.Starting a friendly conversation with the user, guarantee the security of personal data ☒

3.Getting triggered by certain words to access the reporting system ☒

4.Helping users add custom “help codes” to a personal vocabulary ☒

5.Starting a security check by asking follow-up questions based on the custom dictionary ☐

### To run:
# 1. Clone the repository

```bash
git clone https://github.com/ZiminYue/LightsAwait/tree/main
cd <your-project-folder>
```
# 2. Install dependencies

```bash
npm install
```
# 3. Run the server

```bash
node server/server.js
```
# 4. Open in browser

After starting the server, open your browser and go to:
```
http://localhost:3000
```

Open `public/index.html` manually in browser (no bundler needed).

---
