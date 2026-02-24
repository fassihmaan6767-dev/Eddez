FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

COPY . .

# Expose Hugging Face default port
EXPOSE 7860

# Start the server using tsx
CMD ["npx", "tsx", "server.ts"]