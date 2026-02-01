#FROM node:20-bookworm-slim
#
#WORKDIR /app
#
#COPY package.json package-lock.json ./
#RUN npm ci
#
#COPY . .
#
#EXPOSE 3000
#
#CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD npm run dev