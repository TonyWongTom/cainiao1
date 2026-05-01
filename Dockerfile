FROM node:18 AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.9-slim
WORKDIR /app
COPY --from=build-stage /app/dist ./dist
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app.py .

EXPOSE 8080

CMD ["gunicorn", "-b", ":8080", "--workers", "1", "--threads", "8", "app:app"]
